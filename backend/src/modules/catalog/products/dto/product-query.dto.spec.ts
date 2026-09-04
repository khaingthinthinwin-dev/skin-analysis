import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ReviewQueryDto } from './product-query.dto';

describe('ReviewQueryDto', () => {
  it('should pass with no data (all optional with defaults)', async () => {
    const dto = plainToInstance(ReviewQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with valid data', async () => {
    const dto = plainToInstance(ReviewQueryDto, {
      page: 2,
      limit: 20,
      sort: 'rating_desc',
      rating: 4,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid sort', async () => {
    const dto = plainToInstance(ReviewQueryDto, { sort: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with rating > 5', async () => {
    const dto = plainToInstance(ReviewQueryDto, { rating: 6 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with limit > 50', async () => {
    const dto = plainToInstance(ReviewQueryDto, { limit: 51 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
