import { PrismaClient, DeliveryStatus } from '@prisma/client';
import { AssignRider, RiderAssigned, RiderAssignmentFailed } from '@food-delivery/shared';
import { publishEvent } from '../kafka/producer';

const prisma = new PrismaClient();

// Stub rider pool — in production this queries available riders
// from a real rider management system
const STUB_RIDERS = [
  { id: 'rider-001', name: 'Ravi Kumar' },
  { id: 'rider-002', name: 'Suresh Das' },
  { id: 'rider-003', name: 'Amit Singh' },
];

export async function handleAssignRider(event: AssignRider): Promise<void> {
  console.log(`[Delivery] Assigning rider for order ${event.orderId}`);

  // Idempotency check
  const existing = await prisma.delivery.findUnique({
    where: { orderId: event.orderId },
  });
  if (existing) {
    console.warn(`[Delivery] Delivery for order ${event.orderId} already exists — skipping`);
    return;
  }

  // Create pending delivery record
  await prisma.delivery.create({
    data: {
      orderId: event.orderId,
      status: DeliveryStatus.PENDING,
      deliveryAddress: event.deliveryAddress,
    },
  });

  try {
    // Round-robin rider selection from stub pool
    const rider = STUB_RIDERS[Math.floor(Math.random() * STUB_RIDERS.length)];

    await prisma.delivery.update({
      where: { orderId: event.orderId },
      data: {
        riderId: rider.id,
        riderName: rider.name,
        status: DeliveryStatus.ASSIGNED,
        estimatedDeliveryMins: 35,
      },
    });

    const assignedEvent: RiderAssigned = {
      type: 'RiderAssigned',
      orderId: event.orderId,
      riderId: rider.id,
      riderName: rider.name,
      estimatedDeliveryMins: 35,
      correlationId: event.correlationId,
      assignedAt: new Date().toISOString(),
    };

    await publishEvent('delivery.events', assignedEvent, event.orderId);
    console.log(`[Delivery] Rider ${rider.name} assigned to order ${event.orderId}`);
  } catch (err) {
    await prisma.delivery.update({
      where: { orderId: event.orderId },
      data: {
        status: DeliveryStatus.FAILED,
        failureReason: String(err),
      },
    });

    const failedEvent: RiderAssignmentFailed = {
      type: 'RiderAssignmentFailed',
      orderId: event.orderId,
      reason: 'No riders available',
      correlationId: event.correlationId,
      failedAt: new Date().toISOString(),
    };

    await publishEvent('delivery.events', failedEvent, event.orderId);
    throw err;
  }
}