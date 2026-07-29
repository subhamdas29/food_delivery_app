import { PrismaClient, RestaurantOrderStatus } from '../generated/client';
import { ConfirmOrder, OrderConfirmed } from '@food-delivery/shared';
import { publishEvent } from '../kafka/producer';

const prisma = new PrismaClient();

export async function handleConfirmOrder(event: ConfirmOrder): Promise<void> {
  console.log(`[Restaurant] Processing order ${event.orderId} for restaurant ${event.restaurantId}`);

  const existing = await prisma.restaurantOrder.findUnique({
    where: {orderId: event.orderId}
  });

  if(existing){
    console.warn(`[Restaurant] Order ${event.orderId} already processed`);
    return;
  }

  const restaurantOrder = await prisma.restaurantOrder.create({
    data:{
        orderId: event.orderId,
        restaurantId: event.restaurantId,
        status: RestaurantOrderStatus.CONFIRMED,
        estimatedPrepMins: 25,
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


 const confirmedEvent: OrderConfirmed = {
    type: 'OrderConfirmed',
    orderId: event.orderId,
    restaurantId: event.restaurantId,
    estimatedPrepMins: restaurantOrder.estimatedPrepMins ?? 25,
    correlationId: event.correlationId,
    confirmedAt: new Date().toISOString(),
  };

  await publishEvent('restaurant.events', confirmedEvent, event.orderId);
  console.log(`[Restaurant] Order ${event.orderId} confirmed`);
}