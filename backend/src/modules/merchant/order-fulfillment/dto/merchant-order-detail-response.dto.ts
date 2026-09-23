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
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: Record<string, string>;
  notes: string | null;
  customer: CustomerInfoDto;
  availableTransitions: string[];
}
