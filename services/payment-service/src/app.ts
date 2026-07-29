import 'dotenv/config';
import express from 'express';
import { PrismaClient } from './generated/client';
import { connectProducer, disconnectProducer } from './kafka/producer';
import { connectConsumer, disconnectConsumer } from './kafka/consumer';
import { handleChargePayment } from './handlers/chargePayment';
import { handleRefundPayment } from './handlers/refundPayment';
import { PaymentCommand } from '@food-delivery/shared';
import { HealthCheckResponse } from '@food-delivery/shared';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PAYMENT_SERVICE_PORT ?? 3002;

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
    service: 'payment-service',
    timestamp: new Date().toISOString(),
    checks: { database: dbStatus, kafka: 'ok' },
  };

  res.status(response.status === 'ok' ? 200 : 503).json(response);
});

async function handleMessage(event: PaymentCommand): Promise<void> {
  switch (event.type) {
    case 'ChargePayment':
      return handleChargePayment(event);
    case 'RefundPayment':
      return handleRefundPayment(event);
    default:
      console.warn(`[Payment] Unknown command type`);
  }
}

async function start() {
  try {
    await prisma.$connect();
    console.log('[Payment] Database connected');

    await connectProducer();
    await connectConsumer(handleMessage);

    app.listen(PORT, () => {
      console.log(`[Payment] Listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[Payment] Failed to start:', err);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('[Payment] Shutting down...');
  await disconnectConsumer();
  await disconnectProducer();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();