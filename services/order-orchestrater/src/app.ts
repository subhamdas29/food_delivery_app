import 'dotenv/config';
import express from 'express';
import { PrismaClient } from './generated/client';
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
      kafka: 'ok',
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
      // If order not saved to DB yet, return initial PAYMENT_PROCESSING status
      return res.json({
        orderId: req.params.id,
        status: 'PAYMENT_PROCESSING',
        currentStep: 'PAYMENT',
        failureReason: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      });
    }

    return res.json({
      orderId: order.id,
      status: order.status,
      currentStep: order.sagaState?.currentStep ?? 'PAYMENT',
      failureReason: order.sagaState?.failureReason ?? null,
      createdAt: order.createdAt,
      completedAt: order.completedAt ?? null,
    });
  } catch (err) {
    console.error('[Orchestrator] Error fetching order status:', err);
    // Return graceful initial status fallback on transient DB lookup error
    return res.json({
      orderId: req.params.id,
      status: 'PAYMENT_PROCESSING',
      currentStep: 'PAYMENT',
      failureReason: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    });
  }
});

async function connectDbWithRetry(retries = 15, delayMs = 3000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log('[Orchestrator] Database connected');
      return;
    } catch (err) {
      console.warn(`[Orchestrator] Waiting for database (attempt ${i + 1}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('[Orchestrator] Database connection timeout');
}

async function start() {
  // Start Express HTTP server FIRST so port 3001 listens immediately
  app.listen(PORT, () => {
    console.log(`[Orchestrator] Listening on port ${PORT}`);
  });

  try {
    await connectDbWithRetry();
    await connectProducer();
    await connectConsumer(handleEvent);
  } catch (err) {
    console.error('[Orchestrator] Background initialization warning:', err);
  }
}

async function shutdown() {
  console.log('[Orchestrator] Shutting down gracefully...');
  await disconnectConsumer();
  await disconnectProducer();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();