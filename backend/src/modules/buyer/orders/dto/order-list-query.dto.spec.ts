import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OrderListQueryDto } from './order-list-query.dto';

describe('OrderListQueryDto', () => {
  it('accepts the documented filters and applies defaults', async () => {
    const dto = plainToInstance(OrderListQueryDto, {
      status: 'shipped',
      from: '2026-08-01',
      to: '2026-08-31',
      page: '2',
      limit: '50',
      sort: 'totalAmount',
      order: 'asc',
      merchantId: '550e8400-e29b-41d4-a716-446655440000',
      shopId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(50);

    const defaults = plainToInstance(OrderListQueryDto, {});
    expect(defaults.page).toBe(1);
    expect(defaults.limit).toBe(20);
    expect(defaults.sort).toBe('createdAt');
    expect(defaults.order).toBe('desc');
  });

  it.each([
    [{ status: 'processing' }],
    [{ from: 'not-a-date' }],
    [{ page: 0 }],
    [{ limit: 101 }],
    [{ sort: 'id' }],
    [{ order: 'sideways' }],
    [{ merchantId: 'not-a-uuid' }],
    [{ shopId: 'not-a-uuid' }],
  ])('rejects invalid query input: %o', async (input) => {
    const dto = plainToInstance(OrderListQueryDto, input);
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
