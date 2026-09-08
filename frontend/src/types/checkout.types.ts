export interface ShippingAddress {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export type PaymentMethod = 'cod' | 'bank_transfer' | 'card';

export interface CheckoutItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  stockQuantity: number;
  isAvailable: boolean;
  merchantId: string;
}

export interface CheckoutData {
  items: CheckoutItem[];
  subtotal: string;
  discountAmount: string;
  total: string;
  cartId: string;
}

export interface SponsoredAd {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
}

export interface CouponValidation {
  discountType: string;
  discountValue: string;
  discountAmount: string;
  newTotal: string;
}

export interface CreateOrderPayload {
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  notes?: string;
}

export interface OrderConfirmation {
  orderId: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  discountAmount: string;
  total: string;
  paymentMethod: string;
  shippingAddress: ShippingAddress;
  createdAt: string;
  estimatedDelivery: string;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  statusName: string;
  totalAmount: string;
  discountAmount: string;
  itemCount: number;
  createdAt: string;
  paymentMethod: string;
  paymentStatus: string;
}

export interface OrderHistoryResponse {
  orders: OrderListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderDetailItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface OrderTimelineEntry {
  status: string;
  statusName: string;
  note: string | null;
  changedBy: string;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  statusName: string;
  totalAmount: string;
  discountAmount: string;
  paymentMethod: string;
  paymentStatus: string;
  couponCode: string | null;
  notes: string | null;
  shippingAddress: ShippingAddress;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  items: OrderDetailItem[];
  timeline: OrderTimelineEntry[];
}

export interface TrackingTimelineEntry {
  status: string;
  statusName: string;
  completed: boolean;
  timestamp: string | null;
}

export interface OrderTracking {
  orderId: string;
  orderNumber: string;
  currentStatus: string;
  currentStatusName: string;
  merchantName: string;
  createdAt: string;
  estimatedDelivery: string;
  timeline: TrackingTimelineEntry[];
}
