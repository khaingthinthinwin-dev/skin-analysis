export interface CustomerInfoDto {
  name: string;
  email: string;
  phone: string | null;
}

export interface MerchantOrderItemDto {
  id: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface MerchantOrderDetailResponseDto {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  statusName: string;
  items: MerchantOrderItemDto[];
  discountAmount: string;
  totalAmount: string;
  /**
   * `orders.commission_rate` — the platform rate this order was charged, i.e. the
   * rate in force when the order was placed (BR-OI-023), as a fixed 2-decimal
   * percentage string ("12.00"), matching the Revenue Summary's `commissionRate`.
   *
   * Always present: the column is `DECIMAL(5,2) NOT NULL DEFAULT 12.00`, so the
   * frontend can prefer the order's own rate over the current platform rate and
   * label the fallback "(current rate)" only when this field is missing.
   */
  commissionRate: string;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: Record<string, string>;
  notes: string | null;
  customer: CustomerInfoDto;
  availableTransitions: string[];
}
