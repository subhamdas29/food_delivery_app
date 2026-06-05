import { publishEvent } from '../kafka/producer';
import {
  OrderPlaced,
  PaymentSuccessful,
  OrderConfirmed,
  ChargePayment,
  RefundPayment,
  ConfirmOrder,
  AssignRider,
} from '@food-delivery/shared';

// ── Step 1: Payment ───────────────────────────────────────────────────────────

export async function executePaymentStep(order: OrderPlaced):Promise<void>{
    const command: ChargePayment = {
        type: 'ChargePayment',
        orderId: order.orderId,
        userId: order.userId,
        amount: order.totalAmount,
        currency: order.currency,
        correlationId: order.orderId
    }
    await publishEvent("payments.commands", command, order.orderId);
}

export async function compensatePaymentStep(
  orderId: string,
  userId: string,
  amount: number,
  currency: string,
  reason: string
): Promise<void> {
  const command: RefundPayment = {
    type: 'RefundPayment',
    orderId,
    userId,
    amount,
    currency,
    reason,
    correlationId: orderId,
  };
  await publishEvent('payments.commands', command, orderId);
}

// ── Step 2: Restaurant confirmation ──────────────────────────────────────────

export async function executeRestaurantStep(
  order: OrderPlaced
): Promise<void> {
  const command: ConfirmOrder = {
    type: 'ConfirmOrder',
    orderId: order.orderId,
    restaurantId: order.restaurantId,
    items: order.items,
    correlationId: order.orderId,
  };
  await publishEvent('restaurant.commands', command, order.orderId);
}

// ── Step 3: Rider assignment ──────────────────────────────────────────────────

export async function executeDeliveryStep(
  event: OrderConfirmed,
  order: OrderPlaced
): Promise<void> {
  const command: AssignRider = {
    type: 'AssignRider',
    orderId: event.orderId,
    restaurantId: event.restaurantId,
    deliveryAddress: {
      street: 'TBD',
      city: 'TBD',
      pincode: '000000',
    },
    correlationId: event.orderId,
  };
  await publishEvent('delivery.commands', command, event.orderId);
}