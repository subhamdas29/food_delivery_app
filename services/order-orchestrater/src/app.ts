import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { connectProducer, disconnectProducer } from './kafka/producer';
import { connectConsumer, disconnectConsumer } from './kafka/consumer';
import { handleEvent } from './orchestrator/OrderSaga';
import { HealthCheckResponse } from '@food-delivery/shared';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.ORCHESTRATOR_PORT ?? 3001;

app.use(express.json());


app.get('/health', async (_req, res) => {
  let dbStatus: 'ok' | 'error' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  const response: HealthCheckResponse = {
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    service: 'order-orchestrator',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbStatus,
      kafka: 'ok', // consumer running means kafka is ok
    },
  };

  res.status(response.status === 'ok' ? 200 : 503).json(response);
});


app.get('/orders/:id/status', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { sagaState: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json({
      orderId: order.id,
      status: order.status,
      currentStep: order.sagaState?.currentStep,
      failureReason: order.sagaState?.failureReason ?? null,
      createdAt: order.createdAt,
      completedAt: order.completedAt ?? null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});


async function start() {
  try {
    await prisma.$connect();
    console.log('[Orchestrator] Database connected');

    await connectProducer();
    await connectConsumer(handleEvent);

    app.listen(PORT, () => {
      console.log(`[Orchestrator] Listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[Orchestrator] Failed to start:', err);
    process.exit(1);
  }
}


async function shutdown() {
  console.log('[Orchestrator] Shutting down gracefully...');
  await disconnectConsumer();
  await disconnectProducer();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown); // Signal Terminate; triggered by automated systems like docker, kubernetes, AWS
process.on('SIGINT', shutdown); // Signal Interrupt; triggered by ctrl+c

start();