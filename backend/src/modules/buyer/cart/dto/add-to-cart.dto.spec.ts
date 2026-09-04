import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AddToCartDto } from './add-to-cart.dto';

describe('AddToCartDto', () => {
  it('should pass with valid data', async () => {
    const dto = plainToInstance(AddToCartDto, {
      productId: 'c1234567890abcdef12345678',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with default quantity', () => {
    const dto = plainToInstance(AddToCartDto, {
      productId: 'c1234567890abcdef12345678',
    });
    expect(dto.quantity).toBe(1);
  });

  it('should pass with custom quantity', async () => {
    const dto = plainToInstance(AddToCartDto, {
      productId: 'c1234567890abcdef12345678',
      quantity: 5,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with empty productId', async () => {
    const dto = plainToInstance(AddToCartDto, { productId: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
