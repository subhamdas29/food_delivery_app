import 'dotenv/config';
import express from 'express';
import { PrismaClient } from './generated/client';
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

async function connectDbWithRetry(retries = 15, delayMs = 3000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log('[Delivery] Database connected');
      return;
    } catch (err) {
      console.warn(`[Delivery] Waiting for database (attempt ${i + 1}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('[Delivery] Database connection timeout');
}

async function start() {
  app.listen(PORT, () => {
    console.log(`[Delivery] Listening on port ${PORT}`);
  });

  try {
    await connectDbWithRetry();
    await connectProducer();
    await connectConsumer(handleMessage);
  } catch (err) {
    console.error('[Delivery] Background initialization warning:', err);
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