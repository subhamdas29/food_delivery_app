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

// CORS — allows the frontend dev server to call the gateway
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limiter
app.use(globalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/orders', ordersRouter);

// Dev-only token generator — your friend uses this to get a JWT
// without a real auth service. POST /dev/token { "userId": "user-123" }
app.post('/dev/token', devTokenRoute);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const response: HealthCheckResponse = {
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'ok', // gateway has no DB
      kafka: 'ok',
    },
  };
  res.json(response);
});

// ── Startup ───────────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectProducer();

    app.listen(PORT, () => {
      console.log(`[Gateway] Listening on port ${PORT}`);
      console.log(`[Gateway] CORS enabled for: ${process.env.FRONTEND_URL ?? 'http://localhost:5173'}`);
    });
  } catch (err) {
    console.error('[Gateway] Failed to start:', err);
    process.exit(1);
  }
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