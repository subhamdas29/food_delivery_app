import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { connectProducer, disconnectProducer } from './kafka/producer';
import { connectConsumer, disconnectConsumer } from './kafka/consumer';
import { handleConfirmOrder } from './handlers/confirmOrder';
import { handleConfirmOrRejectOrder } from './handlers/rejectOrder';
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
  // First check if we should reject (rollback path testing)
  // then fall through to confirm if not rejected
  const rejectionRate = parseFloat(process.env.RESTAURANT_REJECTION_RATE ?? '0');
  const shouldReject = Math.random() < rejectionRate;

  if (shouldReject) {
    return handleConfirmOrRejectOrder(event);
  }
  return handleConfirmOrder(event);
}

async function start() {
  try {
    await prisma.$connect();
    console.log('[Restaurant] Database connected');

    await connectProducer();
    await connectConsumer(handleMessage);

    app.listen(PORT, () => {
      console.log(`[Restaurant] Listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[Restaurant] Failed to start:', err);
    process.exit(1);
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