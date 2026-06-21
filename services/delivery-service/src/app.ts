import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { connectProducer, disconnectProducer } from './kafka/producer';
import { connectConsumer, disconnectConsumer } from './kafka/consumer';
import { handleAssignRider } from './handlers/assignRider';
import { DeliveryCommand, HealthCheckResponse } from '@food-delivery/shared';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.DELIVERY_SERVICE_PORT ?? 3004;

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
    service: 'delivery-service',
    timestamp: new Date().toISOString(),
    checks: { database: dbStatus, kafka: 'ok' },
  };

  res.status(response.status === 'ok' ? 200 : 503).json(response);
});

async function handleMessage(event: DeliveryCommand): Promise<void> {
  switch (event.type) {
    case 'AssignRider':
      return handleAssignRider(event);
    default:
      console.warn(`[Delivery] Unknown command type`);
  }
}

async function start() {
  try {
    await prisma.$connect();
    console.log('[Delivery] Database connected');

    await connectProducer();
    await connectConsumer(handleMessage);

    app.listen(PORT, () => {
      console.log(`[Delivery] Listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[Delivery] Failed to start:', err);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('[Delivery] Shutting down...');
  await disconnectConsumer();
  await disconnectProducer();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();