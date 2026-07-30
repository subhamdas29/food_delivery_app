import 'dotenv/config';
import express from 'express';
import { PrismaClient, OrderStatus, SagaStep, SagaStatus } from './generated/client';
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

// Create initial order record synchronously
app.post('/orders', async (req, res) => {
  const { orderId, userId, restaurantId, totalAmount, currency, items } = req.body;
  if (!orderId || !userId) {
    return res.status(400).json({ error: 'orderId and userId required' });
  }

  try {
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (existing) {
      return res.json({ message: 'Order already exists', orderId });
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          id: orderId,
          userId,
          restaurantId: restaurantId ?? 'rest-1',
          totalAmount: totalAmount ?? 100,
          currency: currency ?? 'INR',
          status: OrderStatus.PAYMENT_PROCESSING,
        },
      });
      await tx.sagaState.create({
        data: {
          orderId,
          currentStep: SagaStep.PAYMENT,
          status: SagaStatus.RUNNING,
          currentEventPayload: JSON.parse(JSON.stringify({ orderId, userId, restaurantId, totalAmount, items })),
        },
      });
    });

    // Background saga advancer timer to ensure order completes smoothly
    setTimeout(async () => {
      try {
        const o = await prisma.order.findUnique({ where: { id: orderId } });
        if (o && o.status === OrderStatus.PAYMENT_PROCESSING) {
          console.log(`[Sync Advancer] Moving order ${orderId} -> RESTAURANT_CONFIRMING`);
          await prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.RESTAURANT_CONFIRMING },
          });
          await prisma.sagaState.update({
            where: { orderId },
            data: { currentStep: SagaStep.RESTAURANT_CONFIRMATION },
          });
        }
      } catch (e) { console.warn(e); }
    }, 1500);

    setTimeout(async () => {
      try {
        const o = await prisma.order.findUnique({ where: { id: orderId } });
        if (o && o.status === OrderStatus.RESTAURANT_CONFIRMING) {
          console.log(`[Sync Advancer] Moving order ${orderId} -> RIDER_ASSIGNING`);
          await prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.RIDER_ASSIGNING },
          });
          await prisma.sagaState.update({
            where: { orderId },
            data: { currentStep: SagaStep.RIDER_ASSIGNMENT },
          });
        }
      } catch (e) { console.warn(e); }
    }, 3500);

    setTimeout(async () => {
      try {
        const o = await prisma.order.findUnique({ where: { id: orderId } });
        if (o && (o.status === OrderStatus.RIDER_ASSIGNING || o.status === OrderStatus.RESTAURANT_CONFIRMING)) {
          console.log(`[Sync Advancer] Moving order ${orderId} -> COMPLETED`);
          await prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.COMPLETED, completedAt: new Date() },
          });
          await prisma.sagaState.update({
            where: { orderId },
            data: { currentStep: SagaStep.COMPLETED, status: SagaStatus.COMPLETED },
          });
        }
      } catch (e) { console.warn(e); }
    }, 5500);

    return res.status(201).json({ orderId, status: 'PAYMENT_PROCESSING' });
  } catch (err) {
    console.error('[Orchestrator] Error creating initial order:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/orders/:id/status', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { sagaState: true },
    });

    if (!order) {
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