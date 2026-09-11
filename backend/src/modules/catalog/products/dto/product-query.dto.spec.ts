import 'reflect-metadata';
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
      sortBy: 'newest',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with all sort options', async () => {
    const sortOptions = ['newest', 'oldest', 'highest', 'lowest'];
    for (const sortBy of sortOptions) {
      const dto = plainToInstance(ReviewQueryDto, { sortBy });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('should fail with invalid sortBy', async () => {
    const dto = plainToInstance(ReviewQueryDto, { sortBy: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with limit > 50', async () => {
    const dto = plainToInstance(ReviewQueryDto, { limit: 51 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with page < 1', async () => {
    const dto = plainToInstance(ReviewQueryDto, { page: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
