import 'dotenv/config';
import express from 'express';
import { PrismaClient } from './generated/client';
import { connectProducer, disconnectProducer } from './kafka/producer';
import { connectConsumer, disconnectConsumer } from './kafka/consumer';
import { handleConfirmOrder } from './handlers/confirmOrder';
import { handleRejectOrder } from './handlers/rejectOrder';
import { ConfirmOrder, HealthCheckResponse } from '@food-delivery/shared';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.RESTAURANT_SERVICE_PORT ?? 3003;

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
    service: 'restaurant-service',
    timestamp: new Date().toISOString(),
    checks: { database: dbStatus, kafka: 'ok' },
  };

  res.status(response.status === 'ok' ? 200 : 503).json(response);
});

async function handleMessage(event: ConfirmOrder): Promise<void> {
  const envRate = parseFloat(process.env.RESTAURANT_REJECTION_RATE ?? '0');
  const isTestRejectRestaurant = event.restaurantId === 'rest-reject-test';
  const rejectionRate = isTestRejectRestaurant ? 0.3 : envRate;
  const shouldReject = Math.random() < rejectionRate;

  if (shouldReject) {
    return handleRejectOrder(event);
  }
  return handleConfirmOrder(event);
}

async function connectDbWithRetry(retries = 15, delayMs = 3000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log('[Restaurant] Database connected');
      return;
    } catch (err) {
      console.warn(`[Restaurant] Waiting for database (attempt ${i + 1}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('[Restaurant] Database connection timeout');
}

async function start() {
  app.listen(PORT, () => {
    console.log(`[Restaurant] Listening on port ${PORT}`);
  });

  try {
    await connectDbWithRetry();
    await connectProducer();
    await connectConsumer(handleMessage);
  } catch (err) {
    console.error('[Restaurant] Background initialization warning:', err);
  }
}

async function shutdown() {
  console.log('[Restaurant] Shutting down...');
  await disconnectConsumer();
  await disconnectProducer();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();