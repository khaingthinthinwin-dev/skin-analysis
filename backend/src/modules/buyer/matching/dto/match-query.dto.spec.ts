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
