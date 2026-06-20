import { PrismaClient, RestaurantOrderStatus } from '@prisma/client';
import { ConfirmOrder, OrderRejected } from '@food-delivery/shared';
import { publishEvent } from '../kafka/producer';

const prisma = new PrismaClient();

const REJECTION_RATE = parseFloat(process.env.RESTAURANT_REJECTION_RATE ?? '0.2');

export async function handleConfirmOrRejectOrder(event: ConfirmOrder): Promise<void> {
  const shouldReject = Math.random() < REJECTION_RATE;

  if (shouldReject) {
    console.log(`[Restaurant] Rejecting order ${event.orderId} (simulated rejection)`);

    await prisma.restaurantOrder.create({
      data: {
        orderId: event.orderId,
        restaurantId: event.restaurantId,
        status: RestaurantOrderStatus.REJECTED,
        rejectionReason: 'Restaurant is too busy to accept new orders',
        items: {
          create: event.items.map((item) => ({
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
    });

    const rejectedEvent: OrderRejected = {
      type: 'OrderRejected',
      orderId: event.orderId,
      restaurantId: event.restaurantId,
      reason: 'Restaurant is too busy to accept new orders',
      correlationId: event.correlationId,
      rejectedAt: new Date().toISOString(),
    };

    await publishEvent('restaurant.events', rejectedEvent, event.orderId);
    console.log(`[Restaurant] Order ${event.orderId} rejected — refund saga will trigger`);
  }
}