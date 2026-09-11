export enum OrderStatus {
  PLACED = 'placed',
  CONFIRMED = 'confirmed',
  PACKED = 'packed',
  SHIPPED = 'shipped',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
}

export const ORDER_STATUS_FILTER_VALUES: OrderStatus[] = [
  OrderStatus.PLACED,
  OrderStatus.CONFIRMED,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

export type PaymentStatus = 'pending' | 'completed';

export interface OrderListRowDto {
  id: string;
  createdAt: string;
  status: OrderStatus;
  itemCount: number;
  totalAmount: string;
  paymentStatus: PaymentStatus;
}

export interface PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
}

export interface OrderListResponseDto {
  orders: OrderListRowDto[];
  meta: PaginationMetaDto;
}

export type OrderSortField = 'createdAt' | 'totalAmount' | 'status';
export type SortDirection = 'asc' | 'desc';

export const ORDER_SORT_FIELD_VALUES: OrderSortField[] = ['createdAt', 'totalAmount', 'status'];
export const SORT_DIRECTION_VALUES: SortDirection[] = ['asc', 'desc'];