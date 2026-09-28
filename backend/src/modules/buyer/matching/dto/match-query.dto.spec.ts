import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { MatchQueryDto } from './match-query.dto';

describe('MatchQueryDto', () => {
  it('should pass with no data (all optional)', async () => {
    const dto = plainToInstance(MatchQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with all fields', async () => {
    const dto = plainToInstance(MatchQueryDto, {
      skinTypes: 'oily',
      ingredients: 'vitamin c',
      minPrice: 10,
      maxPrice: 100,
      rating: 4,
      sort: 'price',
      order: 'asc',
      page: 1,
      limit: 20,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept the filter params the recommendations page sends', async () => {
    const dto = plainToInstance(MatchQueryDto, {
      categoryId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      skinTypes: 'oily',
      minPrice: 1000,
      maxPrice: 5000,
      rating: 4.5,
      sort: 'createdAt',
      order: 'desc',
      page: 1,
      limit: 12,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept the category alias', async () => {
    const dto = plainToInstance(MatchQueryDto, { category: 'cat-1' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid sort', async () => {
    const dto = plainToInstance(MatchQueryDto, { sort: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid order', async () => {
    const dto = plainToInstance(MatchQueryDto, { order: 'sideways' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with rating < 1', async () => {
    const dto = plainToInstance(MatchQueryDto, { rating: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with rating > 5', async () => {
    const dto = plainToInstance(MatchQueryDto, { rating: 6 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with limit > 50', async () => {
    const dto = plainToInstance(MatchQueryDto, { limit: 51 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with negative minPrice', async () => {
    const dto = plainToInstance(MatchQueryDto, { minPrice: -1 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
