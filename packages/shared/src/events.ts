// ─────────────────────────────────────────────────────────────────────────────
// Kafka Event Contracts
// All events flowing through the platform are defined here.
// Services MUST import from this package — never define local event types.
// ─────────────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_SUCCESS'
  | 'RESTAURANT_CONFIRMING'
  | 'RIDER_ASSIGNING'
  | 'COMPLETED'
  | 'COMPENSATING'
  | 'REFUND_ISSUED'
  | 'FAILED';

// ── Topic: orders.lifecycle ───────────────────────────────────────────────────

export interface OrderPlaced {
  type: 'OrderPlaced';
  orderId: string;
  userId: string;
  restaurantId: string;
  items: OrderItem[];
  totalAmount: number;       // in paise/cents — never float currency
  currency: string;          // e.g. "INR"
  createdAt: string;         // ISO 8601
}

// ── Topic: payments.commands ──────────────────────────────────────────────────

export interface ChargePayment {
  type: 'ChargePayment';
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  correlationId: string;     // same as orderId, used to trace the saga
}

export interface RefundPayment {
  type: 'RefundPayment';
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  reason: string;
  correlationId: string;
}

// ── Topic: payments.events ────────────────────────────────────────────────────

export interface PaymentSuccessful {
  type: 'PaymentSuccessful';
  orderId: string;
  transactionId: string;
  amount: number;
  correlationId: string;
  processedAt: string;
}

export interface PaymentFailed {
  type: 'PaymentFailed';
  orderId: string;
  reason: string;
  correlationId: string;
  failedAt: string;
}

export interface PaymentRefunded {
  type: 'PaymentRefunded';
  orderId: string;
  transactionId: string;
  amount: number;
  correlationId: string;
  refundedAt: string;
}

// ── Topic: restaurant.commands ────────────────────────────────────────────────

export interface ConfirmOrder {
  type: 'ConfirmOrder';
  orderId: string;
  restaurantId: string;
  items: OrderItem[];
  correlationId: string;
}

// ── Topic: restaurant.events ──────────────────────────────────────────────────

export interface OrderConfirmed {
  type: 'OrderConfirmed';
  orderId: string;
  restaurantId: string;
  estimatedPrepMins: number;
  correlationId: string;
  confirmedAt: string;
}

export interface OrderRejected {
  type: 'OrderRejected';
  orderId: string;
  restaurantId: string;
  reason: string;
  correlationId: string;
  rejectedAt: string;
}

// ── Topic: delivery.commands ──────────────────────────────────────────────────

export interface AssignRider {
  type: 'AssignRider';
  orderId: string;
  restaurantId: string;
  deliveryAddress: Address;
  correlationId: string;
}

// ── Topic: delivery.events ────────────────────────────────────────────────────

export interface RiderAssigned {
  type: 'RiderAssigned';
  orderId: string;
  riderId: string;
  riderName: string;
  estimatedDeliveryMins: number;
  correlationId: string;
  assignedAt: string;
}

export interface RiderAssignmentFailed {
  type: 'RiderAssignmentFailed';
  orderId: string;
  reason: string;
  correlationId: string;
  failedAt: string;
}

// ── Discriminated unions per topic ────────────────────────────────────────────

export type PaymentCommand = ChargePayment | RefundPayment;
export type PaymentEvent = PaymentSuccessful | PaymentFailed | PaymentRefunded;
export type RestaurantCommand = ConfirmOrder;
export type RestaurantEvent = OrderConfirmed | OrderRejected;
export type DeliveryCommand = AssignRider;
export type DeliveryEvent = RiderAssigned | RiderAssignmentFailed;

export type AnyEvent =
  | OrderPlaced
  | PaymentCommand
  | PaymentEvent
  | RestaurantCommand
  | RestaurantEvent
  | DeliveryCommand
  | DeliveryEvent;

// ── Shared sub-types ──────────────────────────────────────────────────────────

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Address {
  street: string;
  city: string;
  pincode: string;
  lat?: number;
  lng?: number;
}