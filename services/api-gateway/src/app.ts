import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectProducer, disconnectProducer } from './kafka/producer';
import { globalLimiter } from './middleware/rateLimiter';
import { devTokenRoute } from './middleware/auth';
import ordersRouter from './routes/orders';
import { HealthCheckResponse } from '@food-delivery/shared';

const app = express();
const PORT = process.env.API_GATEWAY_PORT ?? 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

// CORS — allows all origins in production
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limiter
app.use(globalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/orders', ordersRouter);

// Dev-only token generator — POST /dev/token { "userId": "user-123" }
app.post('/dev/token', devTokenRoute);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const response: HealthCheckResponse = {
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'ok',
      kafka: 'ok',
    },
  };
  res.json(response);
});

// ── Startup ───────────────────────────────────────────────────────────────────
async function start() {
  // Start Express server immediately so routes (/dev/token, /orders) are active right away
  app.listen(PORT, () => {
    console.log(`[Gateway] Listening on port ${PORT}`);
  });

  // Connect to Kafka in background
  connectProducer().catch(err => {
    console.warn('[Gateway] Kafka initial connection pending background retry:', err);
  });
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown() {
  console.log('[Gateway] Shutting down...');
  await disconnectProducer();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();