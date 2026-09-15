import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderListQueryDto } from './dto/order-list-query.dto';

const makeQuery = (
  overrides: Partial<OrderListQueryDto> = {},
): OrderListQueryDto => Object.assign(new OrderListQueryDto(), overrides);

const order = {
  id: 'order-1',
  createdAt: new Date('2026-08-21T09:30:00.000Z'),
  statusCode: 'shipped',
  totalAmount: { toString: () => '120.00' },
  paymentStatus: 'completed',
  items: [{ id: 'item-1' }, { id: 'item-2' }],
  buyer: { name: 'Aye Aye' },
  merchant: { shopName: 'Lotus Glow Shop' },
};

describe('OrdersService getOrderHistory', () => {
  const prisma = {
    merchant: { findUnique: jest.fn() },
    order: { findMany: jest.fn(), count: jest.fn() },
  };
  const service = new OrdersService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.order.findMany.mockResolvedValue([order]);
    prisma.order.count.mockResolvedValue(1);
  });

  it('keeps buyerId scoping while applying filters and sorting', async () => {
    const query = makeQuery({
      status: 'shipped',
      from: '2026-08-01',
      to: '2026-08-31',
      page: 2,
      sort: 'status',
      order: 'asc',
    });

    await expect(
      service.getOrderHistory('buyer-1', 'buyer', query),
    ).resolves.toEqual({
      orders: [
        {
          id: 'order-1',
          createdAt: '2026-08-21T09:30:00.000Z',
          status: 'shipped',
          itemCount: 2,
          totalAmount: '120.00',
          paymentStatus: 'completed',
        },
      ],
      meta: { page: 2, limit: 20, total: 1 },
    });

    const where = {
      buyerId: 'buyer-1',
      statusCode: 'shipped',
      createdAt: {
        gte: new Date('2026-08-01T00:00:00.000Z'),
        lt: new Date('2026-09-01T00:00:00.000Z'),
      },
    };
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        orderBy: { statusCode: 'asc' },
        skip: 20,
      }),
    );
    expect(prisma.order.count).toHaveBeenCalledWith({
      where,
    });
  });

  it('scopes approved merchant users and projects customerName only', async () => {
    prisma.merchant.findUnique.mockResolvedValue({
      id: 'merchant-1',
      licenseStatus: 'approved',
    });

    await expect(
      service.getOrderHistory('merchant-user-1', 'merchant', makeQuery()),
    ).resolves.toMatchObject({
      orders: [{ customerName: 'Aye Aye' }],
    });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { merchantId: 'merchant-1' } }),
    );
  });

  it('rejects unapproved merchants', async () => {
    prisma.merchant.findUnique.mockResolvedValue({
      id: 'merchant-1',
      licenseStatus: 'pending',
    });

    await expect(
      service.getOrderHistory('merchant-user-1', 'merchant', makeQuery()),
    ).rejects.toThrow(ForbiddenException);
  });

  it.each(['admin', 'super_admin'])(
    'treats shopId as merchantId for %s and projects admin fields',
    async (roleCode) => {
      await expect(
        service.getOrderHistory(
          'admin-1',
          roleCode,
          makeQuery({ shopId: 'merchant-1' }),
        ),
      ).resolves.toMatchObject({
        orders: [{ customerName: 'Aye Aye', shopName: 'Lotus Glow Shop' }],
      });
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { merchantId: 'merchant-1' } }),
      );
    },
  );

  it('rejects conflicting admin merchant and shop filters', async () => {
    await expect(
      service.getOrderHistory(
        'admin-1',
        'admin',
        makeQuery({ merchantId: 'merchant-1', shopId: 'merchant-2' }),
      ),
    ).rejects.toThrow(
      new BadRequestException('Conflicting merchant/shop filter'),
    );
  });

  it.each(['buyer', 'merchant'])(
    'rejects merchant filters for %s callers in the service as defense in depth',
    async (roleCode) => {
      await expect(
        service.getOrderHistory(
          'user-1',
          roleCode,
          makeQuery({ merchantId: 'merchant-1' }),
        ),
      ).rejects.toThrow(ForbiddenException);
    },
  );

  it('rejects an inverted date range', async () => {
    await expect(
      service.getOrderHistory(
        'buyer-1',
        'buyer',
        makeQuery({ from: '2026-09-01', to: '2026-08-31' }),
      ),
    ).rejects.toThrow(new BadRequestException('Invalid date range'));
  });
});
