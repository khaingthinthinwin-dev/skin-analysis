import { CartSummaryResponseDto } from './cart-summary-response.dto';

describe('CartSummaryResponseDto', () => {
  it('should have correct properties', () => {
    const dto = new CartSummaryResponseDto();
    dto.totalItems = 5;
    dto.subtotal = 100;
    dto.hasOutOfStock = false;
    dto.canCheckout = true;

    expect(dto.totalItems).toBe(5);
    expect(dto.subtotal).toBe(100);
    expect(dto.hasOutOfStock).toBe(false);
    expect(dto.canCheckout).toBe(true);
  });
});
