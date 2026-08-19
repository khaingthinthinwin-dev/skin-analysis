export class CartSummaryResponseDto {
  totalItems: number;
  subtotal: number;
  hasOutOfStock: boolean;
  canCheckout: boolean;
}
