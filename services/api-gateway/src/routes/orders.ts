import { Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { orderLimiter } from '../middleware/rateLimiter';
import { publishEvent } from '../kafka/producer';
import { OrderPlaced, OrderItem, Address } from '@food-delivery/shared';

const router: Router = Router();

// ── POST /orders ──────────────────────────────────────────────────────────────
router.post(
  '/',
  orderLimiter,
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const { restaurantId, items, deliveryAddress, currency } = req.body as {
      restaurantId?: string;
      items?: OrderItem[];
      deliveryAddress?: Address;
      currency?: string;
    };

    // ── Validation ────────────────────────────────────────────
    if (!restaurantId) {
      res.status(400).json({ error: 'restaurantId is required' });
      return;
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items must be a non-empty array' });
      return;
    }
    if (!deliveryAddress) {
      res.status(400).json({ error: 'deliveryAddress is required' });
      return;
    }

    const totalAmount = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    if (totalAmount <= 0) {
      res.status(400).json({ error: 'Order total must be greater than zero' });
      return;
    }

    const orderId = uuidv4();

    const event: OrderPlaced = {
      type: 'OrderPlaced',
      orderId,
      userId: req.userId!,
      restaurantId,
      items,
      totalAmount,
      currency: currency ?? 'INR',
      createdAt: new Date().toISOString(),
    };

    try {
      const orchestratorUrl = process.env.ORCHESTRATOR_URL ?? 'http://order-orchestrator:3001';

      // Synchronously register order record in order_db via orchestrator
      await fetch(`${orchestratorUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId: req.userId!,
          restaurantId,
          totalAmount,
          currency: currency ?? 'INR',
          items,
        }),
      }).catch(err => console.warn('[Gateway] Direct order creation warning:', err));

      // Publish OrderPlaced to Kafka for saga execution
      await publishEvent('orders.lifecycle', event, orderId).catch(err => {
        console.warn('[Gateway] Kafka event publish warning:', err);
      });

      res.status(202).json({
        orderId,
        message: 'Order accepted and is being processed',
        statusUrl: `/orders/${orderId}/status`,
      });
    } catch (err) {
      console.error('[Gateway] Failed to process order:', err);
      res.status(500).json({ error: 'Failed to place order, please try again' });
    }
  }
);

// ── GET /orders/:id/status ────────────────────────────────────────────────────
router.get(
  '/:id/status',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const orchestratorUrl = process.env.ORCHESTRATOR_URL ?? 'http://order-orchestrator:3001';

    try {
      const response = await fetch(`${orchestratorUrl}/orders/${id}/status`, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        res.json(data);
        return;
      }

      res.json({
        orderId: id,
        status: 'PAYMENT_PROCESSING',
        currentStep: 'PAYMENT',
        failureReason: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      });
    } catch (err) {
      console.warn('[Gateway] Warning fetching order status from orchestrator:', err);
      res.json({
        orderId: id,
        status: 'PAYMENT_PROCESSING',
        currentStep: 'PAYMENT',
        failureReason: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      });
    }
  }
);

export default router;