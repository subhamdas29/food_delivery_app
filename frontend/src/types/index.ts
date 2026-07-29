export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_SUCCESS'
  | 'RESTAURANT_CONFIRMING'
  | 'RIDER_ASSIGNING'
  | 'COMPLETED'
  | 'COMPENSATING'
  | 'FAILED';

export interface OrderStatusResponse {
  orderId: string;
  status: OrderStatus;
  currentStep: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface MenuItem {
  itemId: string;
  name: string;
  unitPrice: number;   // in paise (e.g. 25000 = ₹250.00)
  description: string;
  category?: string;
  isVeg?: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface PlaceOrderResponse {
  orderId: string;
  message: string;
  statusUrl: string;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  pincode: string;
}

export interface PlaceOrderPayload {
  restaurantId: string;
  items: {
    itemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
  deliveryAddress: DeliveryAddress;
  currency: string;
}
