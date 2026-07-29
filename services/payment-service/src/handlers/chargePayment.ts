import { PrismaClient, TransactionStatus, TransactionType } from '../generated/client';
import { ChargePayment, PaymentSuccessful, PaymentFailed } from '@food-delivery/shared';
import { publishEvent } from '../kafka/producer';

const prisma = new PrismaClient();

export async function handleChargePayment(event: ChargePayment): Promise<void> {
  console.log(`[Payment] Charging ${event.amount} ${event.currency} for order ${event.orderId}`);

  const existing = await prisma.transaction.findUnique({  //idempotency check
    where: { orderId: event.orderId },
  });
  if (existing) {
    console.warn(`[Payment] Transaction for order ${event.orderId} already exists`);
    return;
  }

  // Create a PENDING transaction record first
  const transaction = await prisma.transaction.create({
    data: {
      orderId: event.orderId,
      userId: event.userId,
      amount: event.amount,
      currency: event.currency,
      type: TransactionType.CHARGE,
      status: TransactionStatus.PENDING,
    },
  });

  try {
    // ── Stub payment gateway ────────────────────────────────
    // In production this is where Stripe/Razorpay gets called.
    // For now we simulate a 90% success rate to allow testing
    // the rollback path without needing real card details.
    const paymentSucceeded = Math.random() > 0.1;

    if (paymentSucceeded) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.SUCCESS },
      });

      const successEvent: PaymentSuccessful = {
        type: 'PaymentSuccessful',
        orderId: event.orderId,
        transactionId: transaction.id,
        amount: event.amount,
        correlationId: event.correlationId,
        processedAt: new Date().toISOString(),
      };

      await publishEvent('payments.events', successEvent, event.orderId);
      console.log(`[Payment] Charge successful for order ${event.orderId}`);
    } else {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          failureReason: 'Simulated payment gateway failure',
        },
      });

      const failedEvent: PaymentFailed = {
        type: 'PaymentFailed',
        orderId: event.orderId,
        reason: 'Payment gateway declined the transaction',
        correlationId: event.correlationId,
        failedAt: new Date().toISOString(),
      };

      await publishEvent('payments.events', failedEvent, event.orderId);
      console.log(`[Payment] Charge failed for order ${event.orderId}`);
    }
  } catch (err) {
    // Mark transaction failed and emit failure event
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.FAILED,
        failureReason: String(err),
      },
    });

    const failedEvent: PaymentFailed = {
      type: 'PaymentFailed',
      orderId: event.orderId,
      reason: 'Internal payment processing error',
      correlationId: event.correlationId,
      failedAt: new Date().toISOString(),
    };

    await publishEvent('payments.events', failedEvent, event.orderId);
    throw err;
  }
}



// dataflow for understanding:

// step 1: check for idempotency, i.e, each order has only one payment
// step 2: make the status "pending" and call the payment app for payment
// step 3: if payment succeeded or failed, generate respective message and call kafka producer to proceed with the info