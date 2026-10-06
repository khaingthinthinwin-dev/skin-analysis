import type { PaginationMetaDto } from './orderInsights.types';
import type { AdminOrderFilterFormData } from '../schemas/orderFilters.schema';
import type { OrderStatus, PaymentStatus } from './orderInsights.types';
import type { MerchantCustomerInfoDto } from './merchantOrderFulfillment.types';

export type AdminOrderFilters = AdminOrderFilterFormData;

export interface AdminOrderListRowDto {
  id: string;
  createdAt: string;
  status: OrderStatus;
  itemCount: number;
  totalAmount: string;
  paymentStatus: PaymentStatus;
  customerName: string;
  shopName: string;
}

/**
 * Filter-aware aggregates the list endpoint computes over the *same* order set
 * the rows come from, so the figures always describe the rows on screen rather
 * than the whole platform. Optional because an older payload may omit it — the
 * tiles then fall back to counts derived from `meta` alone.
 */
export interface AdminOrderListSummaryDto {
  /** SUM(total_amount) over the filtered order set. Order value, not platform revenue. */
  totalSpent: number;
  /** COUNT of filtered orders whose status is not `delivered`. */
  inProgress: number;
  /** COUNT of filtered orders whose status is `delivered` (terminal state). */
  completed: number;
}

export interface AdminOrderListResponseDto {
  orders: AdminOrderListRowDto[];
  meta: PaginationMetaDto;
  summary?: AdminOrderListSummaryDto;
}

export interface AdminMerchantOption {
  id: string;
  shopName: string;
  /** Owning merchant account, used only to disambiguate shops sharing a name. */
  user?: { name?: string; email?: string } | null;
}

export interface AdminOrderDetailItemDto {
  id: string;
  productId?: string;
  productName: string;
  productImage?: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface AdminShippingAddressDto {
  recipientName?: string;
  name?: string;
  phone?: string;
  addressLine1?: string;
  line1?: string;
  addressLine2?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface AdminOrderDetailDto {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt?: string;
  status: OrderStatus;
  statusName?: string;
  items: AdminOrderDetailItemDto[];
  discountAmount: string;
  couponCode: string | null;
  voucherCodes?: Array<{ code: string; discountAmount: number }> | null;
  totalAmount: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  shippingAddress: AdminShippingAddressDto;
  notes: string | null;
  customer: MerchantCustomerInfoDto;
  shop: { name: string; merchantId?: string; merchantName?: string };
  timeline?: AdminOrderTimelineEntryDto[];
}

/** One status-change record, exactly as the order status history stores it. */
export interface AdminOrderTimelineEntryDto {
  status: OrderStatus;
  statusName?: string;
  note?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface AdminOrderTrackingDto {
  orderId?: string;
  currentStatus?: OrderStatus;
  historyAvailable: boolean;
  steps: Array<{
    statusCode: OrderStatus;
    reachedAt: string | null;
  }>;
}
