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

export interface AdminOrderListResponseDto {
  orders: AdminOrderListRowDto[];
  meta: PaginationMetaDto;
}

export interface AdminMerchantOption {
  id: string;
  shopName: string;
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
  status: OrderStatus;
  statusName?: string;
  items: AdminOrderDetailItemDto[];
  discountAmount: string;
  couponCode: string | null;
  totalAmount: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  shippingAddress: AdminShippingAddressDto;
  notes: string | null;
  customer: MerchantCustomerInfoDto;
  shop: { name: string; merchantId?: string };
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
