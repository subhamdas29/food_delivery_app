import { PrismaClient, SagaStep, OrderStatus, SagaStatus } from "../generated/client";
import {
    AnyEvent,
    OrderPlaced,
    PaymentSuccessful,
    PaymentFailed,
    PaymentRefunded,
    OrderConfirmed,
    OrderRejected,
    RiderAssigned,
    RiderAssignmentFailed,
} from "@food-delivery/shared";
import {
    executePaymentStep,
    executeDeliveryStep,
    executeRestaurantStep,
    compensatePaymentStep,
} from "./SagaStep";

const prisma = new PrismaClient();

function toJson(event: unknown): object {
    return JSON.parse(JSON.stringify(event));
}

// Main entry point: called by the kafka consumer for every incoming event
export async function handleEvent(event: AnyEvent): Promise<void> {
    switch (event.type) {
        case "OrderPlaced":
            return onOrderPlaced(event);
        case "PaymentSuccessful":
            return onPaymentSuccessful(event);
        case "PaymentFailed":
            return onPaymentFailed(event);
        case "PaymentRefunded":
            return onPaymentRefunded(event);
        case "OrderConfirmed":
            return onOrderConfirmed(event);
        case "OrderRejected":
            return onOrderRejected(event);
        case "RiderAssigned":
            return onRiderAssigned(event);
        case "RiderAssignmentFailed":
            return onRiderAssignmentFailed(event);
        default:
            console.log(`[Saga] Ignoring event type: ${(event as AnyEvent).type}`);
    }
}

// Order Placed
async function onOrderPlaced(event: OrderPlaced): Promise<void> {
    console.log(`[Saga] OrderPlaced → starting saga for order ${event.orderId}`);

    const existing = await prisma.order.findUnique({
        where: { id: event.orderId },
    });
    if (existing) {
        console.log(`[Saga] Order ${event.orderId} already exists in DB — executing payment step`);
        await executePaymentStep(event);
        return;
    }

    await prisma.$transaction(async (tx) => {
        await tx.order.create({
            data: {
                id: event.orderId,
                userId: event.userId,
                restaurantId: event.restaurantId,
                totalAmount: event.totalAmount,
                currency: event.currency,
                status: OrderStatus.PAYMENT_PROCESSING,
            },
        });
        await tx.sagaState.create({
            data: {
                orderId: event.orderId,
                currentStep: SagaStep.PAYMENT,
                status: SagaStatus.RUNNING,
                currentEventPayload: toJson(event),
            },
        });
        await tx.sagaStepLog.create({
            data: {
                orderId: event.orderId,
                step: SagaStep.PAYMENT,
                status: 'STARTED',
                payload: toJson(event),
            },
        });
    });

    // Execute Payment Step via Kafka event
    await executePaymentStep(event);
}

// Payment successful
async function onPaymentSuccessful(event: PaymentSuccessful): Promise<void> {
    console.log(`[Saga] PaymentSuccessful → confirming with restaurant for ${event.orderId}`);
    const saga = await getSagaOrWarn(event.orderId);
    if (!saga) { return; }
    const order = await prisma.order.findUniqueOrThrow({
        where: { id: event.orderId },
    });

    await prisma.$transaction(async (tx) => {
        await tx.order.update({
            where: { id: event.orderId },
            data: { status: OrderStatus.RESTAURANT_CONFIRMING },
        });
        await tx.sagaState.update({
            where: { orderId: event.orderId },
            data: { currentStep: SagaStep.RESTAURANT_CONFIRMATION, currentEventPayload: toJson(event) },
        });
        await tx.sagaStepLog.create({
            data: {
                orderId: event.orderId,
                step: SagaStep.RESTAURANT_CONFIRMATION,
                status: 'STARTED',
                payload: toJson(event),
            },
        });
    });

    const originalEvent = saga.currentEventPayload as unknown as OrderPlaced;
    const orderPlacedPayload: OrderPlaced = {
        type: "OrderPlaced",
        orderId: order.id,
        userId: order.userId,
        restaurantId: order.restaurantId,
        items: originalEvent?.items ?? [],
        totalAmount: order.totalAmount,
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
    };
    await executeRestaurantStep(orderPlacedPayload);
}

// Rollback: Payment failed (no refund)
async function onPaymentFailed(event: PaymentFailed): Promise<void> {
    console.log(`[Saga] PaymentFailed → marking order ${event.orderId} as FAILED`);
    await prisma.$transaction(async (tx) => {
        await tx.order.update({
            where: { id: event.orderId },
            data: { status: OrderStatus.FAILED, completedAt: new Date() },
        });

        await tx.sagaState.update({
            where: { orderId: event.orderId },
            data: {
                status: SagaStatus.FAILED,
                failureReason: event.reason,
                currentEventPayload: toJson(event),
            },
        });

        await tx.sagaStepLog.create({
            data: {
                orderId: event.orderId,
                step: SagaStep.PAYMENT,
                status: 'FAILED',
                payload: toJson(event),
            },
        });
    });
}

// Restaurant order confirmed
async function onOrderConfirmed(event: OrderConfirmed): Promise<void> {
    console.log(`[Saga] OrderConfirmed → assigning rider for ${event.orderId}`);
    const saga = await getSagaOrWarn(event.orderId);
    if (!saga) { return; }
    const order = await prisma.order.findUniqueOrThrow({
        where: { id: event.orderId },
    });
    const originalEvent = saga.currentEventPayload as unknown as OrderPlaced;
    const orderPlacedPayload: OrderPlaced = {
        type: 'OrderPlaced',
        orderId: order.id,
        userId: order.userId,
        restaurantId: order.restaurantId,
        items: originalEvent?.items ?? [],
        totalAmount: order.totalAmount,
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
    };
    await prisma.$transaction(async (tx) => {
        await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.RIDER_ASSIGNING },
        });
        await tx.sagaState.update({
            where: { orderId: order.id },
            data: {
                currentStep: SagaStep.RIDER_ASSIGNMENT,
                currentEventPayload: toJson(event),
            },
        });
        await tx.sagaStepLog.create({
            data: {
                orderId: event.orderId,
                step: SagaStep.RIDER_ASSIGNMENT,
                status: 'STARTED',
                payload: toJson(event),
            },
        });
    });

    await executeDeliveryStep(event, orderPlacedPayload);
}

// Order rejected by customer, payment should be refunded
async function onOrderRejected(event: OrderRejected): Promise<void> {
    console.log(`[Saga] OrderRejected → triggering refund for ${event.orderId}`);
    const order = await prisma.order.findUniqueOrThrow({
        where: { id: event.orderId },
    });
    await prisma.$transaction(async (tx) => {
        await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.COMPENSATING },
        });
        await tx.sagaState.update({
            where: { orderId: order.id },
            data: {
                currentStep: SagaStep.ROLLBACK_PAYMENT,
                status: SagaStatus.RUNNING,
                failureReason: event.reason,
                currentEventPayload: toJson(event),
            },
        });
        await tx.sagaStepLog.create({
            data: {
                orderId: event.orderId,
                step: SagaStep.ROLLBACK_PAYMENT,
                status: 'COMPENSATING',
                payload: toJson(event),
            },
        });
    });
    await compensatePaymentStep(
        event.orderId,
        order.userId,
        order.totalAmount,
        order.currency,
        `Restaurant rejected: ${event.reason}`
    );
}

// Rider picked up the order
async function onRiderAssigned(event: RiderAssigned): Promise<void> {
    console.log(`[Saga] RiderAssigned → order ${event.orderId} COMPLETED`);
    await prisma.$transaction(async (tx) => {
        await tx.order.update({
            where: { id: event.orderId },
            data: { status: OrderStatus.COMPLETED, completedAt: new Date() },
        });

        await tx.sagaState.update({
            where: { orderId: event.orderId },
            data: {
                currentStep: SagaStep.COMPLETED,
                status: SagaStatus.COMPLETED,
                currentEventPayload: toJson(event),
            },
        });

        await tx.sagaStepLog.create({
            data: {
                orderId: event.orderId,
                step: SagaStep.COMPLETED,
                status: 'SUCCEEDED',
                payload: toJson(event),
            },
        });
    });
}

// No rider picked up
async function onRiderAssignmentFailed(event: RiderAssignmentFailed): Promise<void> {
    console.log(`[Saga] RiderAssignmentFailed → triggering refund for ${event.orderId}`);

    const order = await prisma.order.findUniqueOrThrow({
        where: { id: event.orderId },
    });

    await prisma.$transaction(async (tx) => {
        await tx.order.update({
            where: { id: event.orderId },
            data: { status: OrderStatus.COMPENSATING },
        });

        await tx.sagaState.update({
            where: { orderId: event.orderId },
            data: {
                currentStep: SagaStep.ROLLBACK_PAYMENT,
                status: SagaStatus.RUNNING,
                failureReason: event.reason,
                currentEventPayload: toJson(event),
            },
        });

        await tx.sagaStepLog.create({
            data: {
                orderId: event.orderId,
                step: SagaStep.ROLLBACK_PAYMENT,
                status: 'COMPENSATING',
                payload: toJson(event),
            },
        });
    });

    await compensatePaymentStep(
        event.orderId,
        order.userId,
        order.totalAmount,
        order.currency,
        `Rider assignment failed: ${event.reason}`
    );
}

// Refund successful
async function onPaymentRefunded(event: PaymentRefunded): Promise<void> {
    console.log(`[Saga] PaymentRefunded → order ${event.orderId} FAILED (refund issued)`);

    await prisma.$transaction(async (tx) => {
        await tx.order.update({
            where: { id: event.orderId },
            data: { status: OrderStatus.FAILED, completedAt: new Date() },
        });

        await tx.sagaState.update({
            where: { orderId: event.orderId },
            data: {
                status: SagaStatus.FAILED,
                currentEventPayload: toJson(event),
            },
        });

        await tx.sagaStepLog.create({
            data: {
                orderId: event.orderId,
                step: SagaStep.ROLLBACK_PAYMENT,
                status: 'SUCCEEDED',
                payload: toJson(event),
            },
        });
    });
}

// Helper function
async function getSagaOrWarn(orderId: string) {
    const saga = await prisma.sagaState.findUnique({ where: { orderId } });
    if (!saga) {
        console.warn(`[Saga] No saga state found for order ${orderId} — ignoring event`);
        return null;
    }
    return saga;
}