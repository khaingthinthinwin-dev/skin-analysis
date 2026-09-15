import { ForbiddenException } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderListQueryDto } from './dto/order-list-query.dto';

describe('OrdersController getOrderHistory', () => {
  const getOrderHistory = jest.fn();
  const ordersService = {
    getOrderHistory,
  } as unknown as OrdersService;
  const controller = new OrdersController(ordersService);
  const query = new OrderListQueryDto();

  beforeEach(() => jest.clearAllMocks());

  it('passes the authenticated role and query to the service', async () => {
    const response = { orders: [], meta: { page: 1, limit: 20, total: 0 } };
    getOrderHistory.mockResolvedValue(response);

    await expect(
      controller.getOrderHistory(
        { id: 'buyer-1', email: 'buyer@example.com', roleCode: 'buyer' },
        query,
      ),
    ).resolves.toEqual(response);

    expect(getOrderHistory).toHaveBeenCalledWith('buyer-1', 'buyer', query);
  });

  it.each(['buyer', 'merchant'])(
    'rejects merchant filters for %s callers',
    async (roleCode) => {
      await expect(
        controller.getOrderHistory(
          { id: 'user-1', email: 'user@example.com', roleCode },
          { ...query, merchantId: '550e8400-e29b-41d4-a716-446655440000' },
        ),
      ).rejects.toThrow(ForbiddenException);
    },
  );
});
