import { PrismaClient, TransactionStatus, TransactionType, RefundStatus } from '../generated/client';
import { RefundPayment, PaymentRefunded } from '@food-delivery/shared';
import { publishEvent } from '../kafka/producer';

const prisma = new PrismaClient();

export async function handleRefundPayment(event: RefundPayment): Promise<void> {
  console.log(`[Payment] Refunding order ${event.orderId} — reason: ${event.reason}`);

  // find the original charge transaction
  const original = await prisma.transaction.findUnique({
    where: { orderId: event.orderId },
    include: { refund: true },
  });

  if (!original) {
    console.error(`[Payment] No transaction found for order ${event.orderId} — cannot refund`);
    return;
  }

  // Idempotency 
  if (original.refund) {
    console.warn(`[Payment] Refund for order ${event.orderId} already exists — skipping`);
    return;
  }

  // Create refund record
  const refund = await prisma.refund.create({
    data: {
      transactionId: original.id,
      orderId: event.orderId,
      amount: event.amount,
      reason: event.reason,
      status: RefundStatus.PENDING,
    },
  });

  try {
    // Stub refund processing — always succeeds in dev
    await prisma.refund.update({
      where: { id: refund.id },
      data: { status: RefundStatus.COMPLETED },
    });

    // Mark original transaction as refunded
    await prisma.transaction.update({
      where: { id: original.id },
      data: { status: TransactionStatus.FAILED },
    });

    const refundedEvent: PaymentRefunded = {
      type: 'PaymentRefunded',
      orderId: event.orderId,
      transactionId: original.id,
      amount: event.amount,
      correlationId: event.correlationId,
      refundedAt: new Date().toISOString(),
    };

    await publishEvent('payments.events', refundedEvent, event.orderId);
    console.log(`[Payment] Refund completed for order ${event.orderId}`);
  } catch (err) {
    await prisma.refund.update({
      where: { id: refund.id },
      data: { status: RefundStatus.FAILED },
    });
    throw err;
  }
}