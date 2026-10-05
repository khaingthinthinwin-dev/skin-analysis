import type {
  OrderItemDto,
  OrderShippingAddress,
  OrderStatus,
  PaymentStatus,
} from './orderInsights.types';

export interface MerchantCustomerInfoDto {
  name: string;
  email: string;
  phone: string | null;
}

export interface MerchantOrderItemDto extends Omit<OrderItemDto, 'productId' | 'productSlug'> {
  productImage: string | null;
}

export interface MerchantOrderDetailDto {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  statusName?: string;
  items: MerchantOrderItemDto[];
  discountAmount: string;
  totalAmount: string;
  /**
   * The rate the platform charged on THIS order — `orders.commission_rate`, the
   * rate in force when the order was placed (BR-OI-023) — as a DECIMAL string
   * (e.g. "12.00").
   *
   * Optional on purpose: `GET /merchant/orders/:id` sends it (the status-change
   * response re-sends the refreshed detail), but a cached or older payload can
   * predate it. Every consumer resolves it through `resolveOrderCommissionRate`,
   * which falls back to the current platform rate from the Revenue Summary and
   * labels that fallback as the current rate.
   */
  commissionRate?: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  /** Merchant storefront name, supplied by the server for customer invoices. */
  shopName?: string;
  shippingAddress: OrderShippingAddress;
  notes: string | null;
  customer: MerchantCustomerInfoDto;
  availableTransitions: string[];
}

export interface MerchantTrackingItemDto {
  status: string;
  statusName: string;
  note: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface MerchantTrackingDto {
  timeline: MerchantTrackingItemDto[];
}
