import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  // Real Decimal: the merchant row is formatted with `toFixed(2)`, not `toString()`.
  commissionRate: new Prisma.Decimal('12.00'),
  items: [{ id: 'item-1' }, { id: 'item-2' }],
  buyer: { name: 'Aye Aye' },
  merchant: { shopName: 'Lotus Glow Shop' },
};

describe('OrdersService getOrderHistory', () => {
  const prisma = {
    merchant: { findUnique: jest.fn() },
    shop: { findUnique: jest.fn() },
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
  const service = new OrdersService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.order.findMany.mockResolvedValue([order]);
    prisma.order.count.mockResolvedValue(1);
    prisma.order.aggregate.mockResolvedValue({
      _sum: { totalAmount: 30 },
    });
    prisma.shop.findUnique.mockResolvedValue({ userId: 'merchant-user-1' });
    prisma.merchant.findUnique.mockResolvedValue({ id: 'merchant-1' });
    prisma.$queryRaw.mockResolvedValue([{ id: 'order-1' }]);
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
          shopName: 'Lotus Glow Shop',
        },
      ],
      meta: { page: 2, limit: 20, total: 1 },
      summary: {
        totalSpent: 30,
        inProgress: 1,
        completed: 1,
      },
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

  it('scopes approved merchant users and projects customerName plus the order rate', async () => {
    prisma.merchant.findUnique.mockResolvedValue({
      id: 'merchant-1',
      licenseStatus: 'approved',
    });

    await expect(
      service.getOrderHistory('merchant-user-1', 'merchant', makeQuery()),
    ).resolves.toMatchObject({
      orders: [{ customerName: 'Aye Aye', commissionRate: '12.00' }],
    });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { merchantId: 'merchant-1' } }),
    );
  });

  it("projects each merchant row's own stored rate, never one shared value", async () => {
    prisma.merchant.findUnique.mockResolvedValue({
      id: 'merchant-1',
      licenseStatus: 'approved',
    });
    prisma.order.findMany.mockResolvedValue([
      { ...order, commissionRate: new Prisma.Decimal('10.00') },
      { ...order, id: 'order-2', commissionRate: new Prisma.Decimal('12.5') },
    ]);
    prisma.order.count.mockResolvedValue(2);

    await expect(
      service.getOrderHistory('merchant-user-1', 'merchant', makeQuery()),
    ).resolves.toMatchObject({
      orders: [
        { id: 'order-1', commissionRate: '10.00' },
        // DECIMAL(5,2) is always rendered with two decimals, so 12.5 → '12.50'
        // and the CSV/UI never sees a mixed-precision rate.
        { id: 'order-2', commissionRate: '12.50' },
      ],
    });
  });

  it.each([
    ['buyer', 'buyer-1'],
    ['admin', 'admin-1'],
    ['super_admin', 'admin-1'],
  ])('keeps the stored order rate out of %s rows', async (roleCode, userId) => {
    const result = await service.getOrderHistory(userId, roleCode, makeQuery());

    expect(result.orders[0]).not.toHaveProperty('commissionRate');
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
    'resolves shopId to its merchant for %s and projects admin fields',
    async (roleCode) => {
      await expect(
        service.getOrderHistory(
          'admin-1',
          roleCode,
          makeQuery({ shopId: 'shop-1' }),
        ),
      ).resolves.toMatchObject({
        orders: [{ customerName: 'Aye Aye', shopName: 'Lotus Glow Shop' }],
      });
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { merchantId: 'merchant-1' } }),
      );
      expect(prisma.shop.findUnique).toHaveBeenCalledWith({
        where: { id: 'shop-1' },
        select: { userId: true },
      });
      expect(prisma.merchant.findUnique).toHaveBeenCalledWith({
        where: { userId: 'merchant-user-1' },
        select: { id: true },
      });
    },
  );

  it('rejects conflicting admin merchant and shop filters', async () => {
    prisma.shop.findUnique.mockResolvedValueOnce({ userId: 'merchant-user-2' });
    prisma.merchant.findUnique.mockResolvedValueOnce({ id: 'merchant-2' });
    await expect(
      service.getOrderHistory(
        'admin-1',
        'admin',
        makeQuery({ merchantId: 'merchant-1', shopId: 'shop-2' }),
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

  it('narrows an admin order-number search through the visible 8-char reference', async () => {
    // The table copies `#A1B2C3D4`; the service strips the `#`, lower-cases the
    // rest and substring-matches the first eight characters of the order UUID.
    await expect(
      service.getOrderHistory(
        'admin-1',
        'admin',
        makeQuery({ orderSearch: '#A1B2C3D4' }),
      ),
    ).resolves.toMatchObject({ meta: { total: 1 } });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const [, pattern, merchantPredicate] = prisma.$queryRaw.mock.calls[0] as [
      unknown,
      string,
      { sql: string },
    ];
    expect(pattern).toBe('%a1b2c3d4%');
    // Admins read across all merchants, so no merchant predicate is added.
    expect(merchantPredicate.sql).toBe('');
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['order-1'] } }) as object,
      }),
    );
  });

  it('keeps a merchant order-number search pinned to their own shop', async () => {
    prisma.merchant.findUnique.mockResolvedValue({
      id: 'merchant-1',
      licenseStatus: 'approved',
    });

    await service.getOrderHistory(
      'merchant-user-1',
      'merchant',
      makeQuery({ orderSearch: 'A1B2C3D4' }),
    );

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const [, pattern, merchantPredicate] = prisma.$queryRaw.mock.calls[0] as [
      unknown,
      string,
      { sql: string },
    ];
    expect(pattern).toBe('%a1b2c3d4%');
    expect(merchantPredicate.sql).toContain('merchant_id');
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['order-1'] } }) as object,
      }),
    );
  });

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

describe('OrdersService getOrderDetail and getOrderTracking access', () => {
  const prisma = {
    merchant: { findUnique: jest.fn() },
    order: { findUnique: jest.fn() },
  };
  const service = new OrdersService(prisma as never);
  const detailOrder = {
    id: 'order-1',
    buyerId: 'buyer-1',
    merchantId: 'merchant-1',
    statusCode: 'shipped',
    status: { statusName: 'Shipped' },
    totalAmount: { toString: () => '120.00' },
    discountAmount: { toString: () => '0.00' },
    paymentMethod: 'card',
    paymentStatus: 'completed',
    couponCode: null,
    voucherCodes: null,
    notes: null,
    shippingAddress: { line1: '1 Main St' },
    createdAt: new Date('2026-08-21T09:30:00.000Z'),
    updatedAt: new Date('2026-08-21T09:30:00.000Z'),
    items: [],
    statusHistory: [],
    buyer: { name: 'Aye Aye', email: 'buyer@example.com', phone: '123456' },
    merchant: {
      id: 'merchant-1',
      shopName: 'Lotus Glow Shop',
      user: { name: 'Merchant Name' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.order.findUnique.mockResolvedValue(detailOrder);
    prisma.merchant.findUnique.mockResolvedValue({
      id: 'merchant-1',
      licenseStatus: 'approved',
    });
  });

  it.each(['admin', 'super_admin'])(
    '%s can read any order and receives the admin detail projection',
    async (roleCode) => {
      await expect(
        service.getOrderDetail('admin-user', roleCode, 'order-1'),
      ).resolves.toMatchObject({
        customer: {
          name: 'Aye Aye',
          email: 'buyer@example.com',
          phone: '123456',
        },
        shop: {
          name: 'Lotus Glow Shop',
          merchantId: 'merchant-1',
          merchantName: 'Merchant Name',
        },
      });

      await expect(
        service.getOrderTracking('admin-user', roleCode, 'order-1'),
      ).resolves.toMatchObject({ orderId: 'order-1' });
      expect(prisma.merchant.findUnique).not.toHaveBeenCalled();
    },
  );

  it('lets a buyer read only their own detail and tracking', async () => {
    await expect(
      service.getOrderDetail('buyer-1', 'buyer', 'order-1'),
    ).resolves.toMatchObject({ shop: { name: 'Lotus Glow Shop' } });
    await expect(
      service.getOrderTracking('buyer-1', 'buyer', 'order-1'),
    ).resolves.toMatchObject({ orderId: 'order-1' });

    await expect(
      service.getOrderDetail('another-buyer', 'buyer', 'order-1'),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.getOrderTracking('another-buyer', 'buyer', 'order-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('lets a merchant read only their own shop detail and tracking', async () => {
    await expect(
      service.getOrderDetail('merchant-user-1', 'merchant', 'order-1'),
    ).resolves.toMatchObject({
      customer: { name: 'Aye Aye', email: 'buyer@example.com' },
    });
    await expect(
      service.getOrderTracking('merchant-user-1', 'merchant', 'order-1'),
    ).resolves.toMatchObject({ orderId: 'order-1' });

    prisma.merchant.findUnique.mockResolvedValue({
      id: 'other-merchant',
      licenseStatus: 'approved',
    });
    await expect(
      service.getOrderDetail('merchant-user-2', 'merchant', 'order-1'),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.getOrderTracking('merchant-user-2', 'merchant', 'order-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
