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
  paymentMethod: string;
  paymentStatus: PaymentStatus;
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