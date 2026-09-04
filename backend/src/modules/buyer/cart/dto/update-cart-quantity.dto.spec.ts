import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateCartQuantityDto } from './update-cart-quantity.dto';

describe('UpdateCartQuantityDto', () => {
  it('should pass with valid quantity', async () => {
    const dto = plainToInstance(UpdateCartQuantityDto, { quantity: 3 });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with zero quantity', async () => {
    const dto = plainToInstance(UpdateCartQuantityDto, { quantity: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with quantity > 99', async () => {
    const dto = plainToInstance(UpdateCartQuantityDto, { quantity: 100 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
