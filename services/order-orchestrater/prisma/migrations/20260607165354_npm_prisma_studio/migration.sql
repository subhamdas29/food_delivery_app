-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAYMENT_PROCESSING', 'PAYMENT_SUCCESS', 'RESTAURANT_CONFIRMING', 'RIDER_ASSIGNING', 'COMPLETED', 'COMPENSATING', 'REFUND_ISSUED', 'FAILED');

-- CreateEnum
CREATE TYPE "SagaStep" AS ENUM ('PAYMENT', 'RESTAURANT_CONFIRMATION', 'RIDER_ASSIGNMENT', 'COMPLETED', 'ROLLBACK_PAYMENT');

-- CreateEnum
CREATE TYPE "SagaStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SagaState" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "currentStep" "SagaStep" NOT NULL,
    "status" "SagaStatus" NOT NULL DEFAULT 'RUNNING',
    "currentEventPayload" JSONB,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SagaState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SagaStepLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "step" "SagaStep" NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SagaStepLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SagaState_orderId_key" ON "SagaState"("orderId");

-- AddForeignKey
ALTER TABLE "SagaState" ADD CONSTRAINT "SagaState_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SagaStepLog" ADD CONSTRAINT "SagaStepLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
