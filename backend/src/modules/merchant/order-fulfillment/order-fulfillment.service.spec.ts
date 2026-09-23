import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { OrderFulfillmentService } from './order-fulfillment.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const merchantUser: AuthUser = {
  id: 'user-m1',
  email: 'merchant@example.com',
  roleCode: 'merchant',
};

const approvedMerchant = { id: 'merchant-1', licenseStatus: 'approved' };
const anotherMerchantId = 'merchant-2';

const statusMap: Record<
  string,
  {
    id: number;
    statusCode: string;
    statusName: string;
    displayOrder: number;
    isTerminalState: boolean;
  }
> = {
  placed: {
    id: 1,
    statusCode: 'placed',
    statusName: 'Placed',
    displayOrder: 1,
    isTerminalState: false,
  },
  confirmed: {
    id: 2,
    statusCode: 'confirmed',
    statusName: 'Confirmed',
    displayOrder: 2,
    isTerminalState: false,
  },
  packed: {
    id: 3,
    statusCode: 'packed',
    statusName: 'Packed',
    displayOrder: 3,
    isTerminalState: false,
  },
  shipped: {
    id: 4,
    statusCode: 'shipped',
    statusName: 'Shipped',
    displayOrder: 4,
    isTerminalState: false,
  },
  out_for_delivery: {
    id: 5,
    statusCode: 'out_for_delivery',
    statusName: 'Out for Delivery',
    displayOrder: 5,
    isTerminalState: false,
  },
  delivered: {
    id: 6,
    statusCode: 'delivered',
    statusName: 'Delivered',
    displayOrder: 6,
    isTerminalState: true,
  },
};

const dateValues = {
  id: 'order-1',
  createdAt: new Date('2026-08-21T09:30:00.000Z'),
  merchantId: 'merchant-1',
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  discountAmount: { toString: () => '5.00' },
  totalAmount: { toString: () => '95.00' },
  shippingAddress: { line1: 'A Street' },
  notes: 'Leave at door',
  items: [
    {
      id: 'item-1',
      quantity: 2,
      unitPrice: { toString: () => '25.00' },
      totalPrice: { toString: () => '50.00' },
      product: { id: 'product-1', name: 'Serum', images: ['img-1.jpg'] },
    },
  ],
  buyer: { name: 'Aye Aye', email: 'buyer@example.com', phone: '09123456789' },
};

const makeStatusOrder = (
  statusCode: string,
  overrides: Record<string, unknown> = {},
) => ({
  ...dateValues,
  statusCode,
  status: statusMap[statusCode],
  ...overrides,
});

const makeDetailOrder = (
  statusCode: string,
  overrides: Record<string, unknown> = {},
) => ({
  ...dateValues,
  statusCode,
  status: statusMap[statusCode],
  ...overrides,
});

const objectContaining = <T extends object>(
  value: T,
): jest.AsymmetricMatcher => {
  const matcher: unknown = expect.objectContaining(value);
  return matcher as jest.AsymmetricMatcher;
};

describe('OrderFulfillmentService', () => {
  const prisma = {
    merchant: { findUnique: jest.fn() },
    order: { findUnique: jest.fn() },
    orderStatus: { findUnique: jest.fn(), findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const redis = { checkRateLimit: jest.fn() };
  const tx = {
    order: { update: jest.fn(), findUnique: jest.fn() },
    orderStatusHistory: { create: jest.fn() },
  };

  let service: OrderFulfillmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.merchant.findUnique.mockResolvedValue(approvedMerchant);
    prisma.order.findUnique.mockResolvedValue(null);
    prisma.orderStatus.findFirst.mockImplementation(
      ({ where }: { where: { displayOrder: number } }) =>
        Promise.resolve(
          Object.values(statusMap).find(
            (s) => s.displayOrder === where.displayOrder,
          ) ?? null,
        ),
    );
    prisma.orderStatus.findUnique.mockImplementation(
      ({ where }: { where: { statusCode: string } }) =>
        Promise.resolve(statusMap[where.statusCode] ?? null),
    );
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );
    tx.order.update.mockResolvedValue({});
    tx.order.findUnique.mockResolvedValue(makeDetailOrder('packed'));
    tx.orderStatusHistory.create.mockResolvedValue({ id: 'history-1' });
    redis.checkRateLimit.mockResolvedValue(true);
    service = new OrderFulfillmentService(prisma as never, redis as never);
  });

  describe('merchant gate', () => {
    it('rejects a merchant without a profile', async () => {
      prisma.merchant.findUnique.mockResolvedValue(null);

      const result = await service.getOrderDetail(merchantUser, 'order-1').then(
        () => undefined,
        (error: unknown) => error,
      );
      expect(result).toBeInstanceOf(ForbiddenException);
      expect((result as Error).message).toBe(
        'Your merchant account is not approved',
      );
    });

    it('rejects an unapproved merchant', async () => {
      prisma.merchant.findUnique.mockResolvedValue({
        id: 'merchant-1',
        licenseStatus: 'pending',
      });

      await expect(
        service.getOrderTracking(merchantUser, 'order-1'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateOrderStatus(merchantUser, 'order-1', makeDto('packed')),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getOrderDetail', () => {
    it('returns the full merchant detail with customer block', async () => {
      prisma.order.findUnique.mockResolvedValue(makeDetailOrder('confirmed'));

      await expect(
        service.getOrderDetail(merchantUser, 'order-1'),
      ).resolves.toEqual(
        objectContaining({
          id: 'order-1',
          orderNumber: 'ORD-ORDER-1',
          createdAt: '2026-08-21T09:30:00.000Z',
          status: 'confirmed',
          statusName: 'Confirmed',
          items: [
            {
              id: 'item-1',
              productName: 'Serum',
              productImage: 'img-1.jpg',
              quantity: 2,
              unitPrice: '25.00',
              totalPrice: '50.00',
            },
          ],
          discountAmount: '5.00',
          totalAmount: '95.00',
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          shippingAddress: { line1: 'A Street' },
          notes: 'Leave at door',
          customer: {
            name: 'Aye Aye',
            email: 'buyer@example.com',
            phone: '09123456789',
          },
        }),
      );
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        include: {
          status: true,
          items: {
            include: {
              product: { select: { id: true, name: true, images: true } },
            },
          },
          buyer: { select: { name: true, email: true, phone: true } },
        },
      });
    });

    it('renders item prices as stored in order_items, never product prices', async () => {
      prisma.order.findUnique.mockResolvedValue(makeDetailOrder('confirmed'));

      const result = await service.getOrderDetail(merchantUser, 'order-1');

      expect(result.items).toEqual([
        {
          id: 'item-1',
          productName: 'Serum',
          productImage: 'img-1.jpg',
          quantity: 2,
          unitPrice: '25.00',
          totalPrice: '50.00',
        },
      ]);
      expect(prisma.order.findUnique).toHaveBeenCalledWith(
        objectContaining({
          include: objectContaining({
            items: objectContaining({
              include: objectContaining({
                product: { select: { id: true, name: true, images: true } },
              }),
            }),
          }),
        }),
      );
    });

    it('returns a single null productImage when product has no images', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeDetailOrder('confirmed', {
          items: [
            {
              id: 'item-1',
              quantity: 1,
              unitPrice: { toString: () => '10.00' },
              totalPrice: { toString: () => '10.00' },
              product: { id: 'product-1', name: 'Cream', images: [] },
            },
          ],
        }),
      );

      const result = await service.getOrderDetail(merchantUser, 'order-1');

      expect(result.items[0].productImage).toBeNull();
    });

    it.each([
      ['placed', ['confirmed']],
      ['confirmed', ['packed']],
      ['shipped', ['out_for_delivery']],
      ['delivered', []],
    ] as const)(
      'exposes availableTransitions for current status %s',
      async (statusCode, expectedTransitions) => {
        prisma.order.findUnique.mockResolvedValue(makeDetailOrder(statusCode));

        const result = await service.getOrderDetail(merchantUser, 'order-1');

        expect(result.availableTransitions).toEqual(expectedTransitions);
      },
    );

    it('never looks up a next status for a terminal order', async () => {
      prisma.order.findUnique.mockResolvedValue(makeDetailOrder('delivered'));

      await service.getOrderDetail(merchantUser, 'order-1');

      expect(prisma.orderStatus.findFirst).not.toHaveBeenCalled();
    });

    it('returns 404 for a non-existent order without any audit write', async () => {
      await expect(
        service.getOrderDetail(merchantUser, 'order-1'),
      ).rejects.toEqual(new NotFoundException('Order not found'));
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('returns 404 (never 403) for another merchant and logs CROSS_SCOPE_ACCESS_DENIED', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeDetailOrder('confirmed', { merchantId: anotherMerchantId }),
      );

      await expect(
        service.getOrderDetail(merchantUser, 'order-1'),
      ).rejects.toEqual(new NotFoundException('Order not found'));
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-m1',
          action: 'CROSS_SCOPE_ACCESS_DENIED',
          entityType: 'order',
          entityId: 'order-1',
          newValue: { orderId: 'order-1' },
        },
      });
    });

    it('writes ORDER_DETAIL_VIEWED on success and does not throw when audit fails', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      prisma.order.findUnique.mockResolvedValue(makeDetailOrder('confirmed'));
      prisma.auditLog.create.mockRejectedValue(new Error('audit down'));

      await expect(
        service.getOrderDetail(merchantUser, 'order-1'),
      ).resolves.toBeDefined();

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-m1',
          action: 'ORDER_DETAIL_VIEWED',
          entityType: 'order',
          entityId: 'order-1',
          newValue: { orderId: 'order-1' },
        },
      });
      await Promise.resolve();
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('getOrderTracking', () => {
    it('mirrors the buyer timeline item shape ordered by createdAt asc', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        merchantId: 'merchant-1',
        statusHistory: [
          {
            note: 'Order placed',
            changedBy: null,
            createdAt: new Date('2026-08-21T09:30:00.000Z'),
            status: statusMap.placed,
          },
          {
            note: 'Status updated by merchant',
            changedBy: 'user-m1',
            createdAt: new Date('2026-08-22T10:00:00.000Z'),
            status: statusMap.confirmed,
          },
        ],
      });

      await expect(
        service.getOrderTracking(merchantUser, 'order-1'),
      ).resolves.toEqual({
        timeline: [
          {
            status: 'placed',
            statusName: 'Placed',
            note: 'Order placed',
            changedBy: null,
            createdAt: '2026-08-21T09:30:00.000Z',
          },
          {
            status: 'confirmed',
            statusName: 'Confirmed',
            note: 'Status updated by merchant',
            changedBy: 'user-m1',
            createdAt: '2026-08-22T10:00:00.000Z',
          },
        ],
      });
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        include: {
          statusHistory: {
            include: { status: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    it('returns 404 for a non-existent order', async () => {
      await expect(
        service.getOrderTracking(merchantUser, 'order-1'),
      ).rejects.toEqual(new NotFoundException('Order not found'));
    });

    it('returns 404 and logs CROSS_SCOPE_ACCESS_DENIED for another merchant', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        merchantId: anotherMerchantId,
        statusHistory: [],
      });

      await expect(
        service.getOrderTracking(merchantUser, 'order-1'),
      ).rejects.toEqual(new NotFoundException('Order not found'));
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-m1',
          action: 'CROSS_SCOPE_ACCESS_DENIED',
          entityType: 'order',
          entityId: 'order-1',
          newValue: { orderId: 'order-1' },
        },
      });
    });

    it('writes ORDER_TRACKING_VIEWED on success', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        merchantId: 'merchant-1',
        statusHistory: [],
      });

      await service.getOrderTracking(merchantUser, 'order-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-m1',
          action: 'ORDER_TRACKING_VIEWED',
          entityType: 'order',
          entityId: 'order-1',
          newValue: { orderId: 'order-1' },
        },
      });
    });
  });

  describe('updateOrderStatus', () => {
    it('advances confirmed->packed in one transaction and returns the refreshed detail', async () => {
      prisma.order.findUnique.mockResolvedValue(makeStatusOrder('confirmed'));

      const result = await service.updateOrderStatus(
        merchantUser,
        'order-1',
        makeDto('packed'),
      );

      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { statusCode: 'packed' },
      });
      expect(tx.orderStatusHistory.create).toHaveBeenCalledTimes(1);
      expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          statusId: statusMap.packed.id,
          changedBy: 'user-m1',
          note: 'Status updated by merchant',
        },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-m1',
          action: 'ORDER_STATUS_UPDATED',
          entityType: 'order',
          entityId: 'order-1',
          newValue: { from: 'confirmed', to: 'packed' },
        },
      });
      expect(result.status).toBe('packed');
      expect(result.statusName).toBe('Packed');
      expect(result.availableTransitions).toEqual(['shipped']);
    });

    it('loads the requested status as an order_statuses row by statusCode', async () => {
      prisma.order.findUnique.mockResolvedValue(makeStatusOrder('confirmed'));

      await service.updateOrderStatus(
        merchantUser,
        'order-1',
        makeDto('packed'),
      );

      expect(prisma.orderStatus.findUnique).toHaveBeenCalledWith({
        where: { statusCode: 'packed' },
      });
    });

    it('allows packing a cash-on-delivery order still marked pending payment', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeStatusOrder('confirmed', {
          paymentMethod: 'cod',
          paymentStatus: 'pending',
        }),
      );

      await expect(
        service.updateOrderStatus(merchantUser, 'order-1', makeDto('packed')),
      ).resolves.toBeDefined();
      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { statusCode: 'packed' },
      });
    });

    it('walks the full merchant chain one step at a time', async () => {
      const steps: Array<[string, string]> = [
        ['confirmed', 'packed'],
        ['packed', 'shipped'],
        ['shipped', 'out_for_delivery'],
        ['out_for_delivery', 'delivered'],
      ];

      for (const [from, to] of steps) {
        prisma.order.findUnique.mockResolvedValue(makeStatusOrder(from));
        tx.order.findUnique.mockResolvedValue(makeDetailOrder(to));

        const result = await service.updateOrderStatus(
          merchantUser,
          'order-1',
          makeDto(to),
        );
        expect(result.status).toBe(to);
        expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
          data: {
            orderId: 'order-1',
            statusId: statusMap[to].id,
            changedBy: 'user-m1',
            note: 'Status updated by merchant',
          },
        });
      }
    });

    it('returns 429 on rate-limit exceed keyed per user with limit 20/60s', async () => {
      redis.checkRateLimit.mockResolvedValue(false);

      await expect(
        service.updateOrderStatus(merchantUser, 'order-1', makeDto('packed')),
      ).rejects.toEqual(
        new HttpException(
          'Too many requests. Please wait 60 seconds',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
      expect(redis.checkRateLimit).toHaveBeenCalledWith(
        'rate:order-fulfillment:status:user-m1',
        20,
        60,
      );
      expect(prisma.merchant.findUnique).not.toHaveBeenCalled();
    });

    it('allows the 20th call in a window and blocks the 21st (21st call -> 429)', async () => {
      prisma.order.findUnique.mockResolvedValue(makeStatusOrder('confirmed'));
      redis.checkRateLimit
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(
        service.updateOrderStatus(merchantUser, 'order-1', makeDto('packed')),
      ).resolves.toBeDefined();
      await expect(
        service.updateOrderStatus(merchantUser, 'order-1', makeDto('packed')),
      ).rejects.toEqual(
        new HttpException(
          'Too many requests. Please wait 60 seconds',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
    });

    it('rejects a skip (confirmed->shipped) with 422', async () => {
      prisma.order.findUnique.mockResolvedValue(makeStatusOrder('confirmed'));

      await expect(
        service.updateOrderStatus(merchantUser, 'order-1', makeDto('shipped')),
      ).rejects.toEqual(
        new UnprocessableEntityException(
          'Orders can only move forward one step at a time',
        ),
      );
      expect(tx.order.update).not.toHaveBeenCalled();
    });

    it('rejects a backward move (packed->confirmed) with 422', async () => {
      prisma.order.findUnique.mockResolvedValue(makeStatusOrder('packed'));

      await expect(
        service.updateOrderStatus(
          merchantUser,
          'order-1',
          makeDto('confirmed'),
        ),
      ).rejects.toThrow('Orders can only move forward one step at a time');
      expect(prisma.orderStatus.findUnique).toHaveBeenCalledWith({
        where: { statusCode: 'confirmed' },
      });
      expect(tx.order.update).not.toHaveBeenCalled();
    });

    it('rejects any move from a delivered order with 422 already delivered', async () => {
      prisma.order.findUnique.mockResolvedValue(makeStatusOrder('delivered'));

      await expect(
        service.updateOrderStatus(merchantUser, 'order-1', makeDto('shipped')),
      ).rejects.toEqual(
        new UnprocessableEntityException(
          'This order has already been delivered',
        ),
      );
      expect(prisma.orderStatus.findUnique).not.toHaveBeenCalled();
    });

    it('checks the terminal state before validating the requested status', async () => {
      prisma.order.findUnique.mockResolvedValue(makeStatusOrder('delivered'));

      await expect(
        service.updateOrderStatus(merchantUser, 'order-1', makeDto('bogus')),
      ).rejects.toEqual(
        new UnprocessableEntityException(
          'This order has already been delivered',
        ),
      );
    });

    it('advances placed->confirmed (merchant confirms on the detail page)', async () => {
      prisma.order.findUnique.mockResolvedValue(makeStatusOrder('placed'));
      tx.order.findUnique.mockResolvedValue(makeDetailOrder('confirmed'));

      const result = await service.updateOrderStatus(
        merchantUser,
        'order-1',
        makeDto('confirmed'),
      );

      expect(prisma.orderStatus.findUnique).toHaveBeenCalledWith({
        where: { statusCode: 'confirmed' },
      });
      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { statusCode: 'confirmed' },
      });
      expect(tx.orderStatusHistory.create).toHaveBeenCalledTimes(1);
      expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          statusId: statusMap.confirmed.id,
          changedBy: 'user-m1',
          note: 'Status updated by merchant',
        },
      });
      expect(result.status).toBe('confirmed');
      expect(result.availableTransitions).toEqual(['packed']);
    });

    it('rejects targeting placed (placed is set only at checkout)', async () => {
      prisma.order.findUnique.mockResolvedValue(makeStatusOrder('confirmed'));

      await expect(
        service.updateOrderStatus(merchantUser, 'order-1', makeDto('placed')),
      ).rejects.toThrow('Orders can only move forward one step at a time');
      expect(tx.order.update).not.toHaveBeenCalled();
    });

    it('rejects re-setting the same status with 422', async () => {
      prisma.order.findUnique.mockResolvedValue(makeStatusOrder('packed'));

      await expect(
        service.updateOrderStatus(merchantUser, 'order-1', makeDto('packed')),
      ).rejects.toThrow('Orders can only move forward one step at a time');
      expect(tx.order.update).not.toHaveBeenCalled();
    });

    it('returns 400 for an unknown status code', async () => {
      prisma.order.findUnique.mockResolvedValue(makeStatusOrder('confirmed'));

      await expect(
        service.updateOrderStatus(merchantUser, 'order-1', makeDto('bogus')),
      ).rejects.toEqual(new BadRequestException('Invalid status'));
      expect(tx.order.update).not.toHaveBeenCalled();
    });

    it('returns 404 and logs CROSS_SCOPE_ACCESS_DENIED for another merchant', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeStatusOrder('confirmed', { merchantId: anotherMerchantId }),
      );

      await expect(
        service.updateOrderStatus(merchantUser, 'order-1', makeDto('packed')),
      ).rejects.toEqual(new NotFoundException('Order not found'));
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-m1',
          action: 'CROSS_SCOPE_ACCESS_DENIED',
          entityType: 'order',
          entityId: 'order-1',
          newValue: { orderId: 'order-1' },
        },
      });
      expect(tx.order.update).not.toHaveBeenCalled();
    });

    it('returns 404 when the order is gone mid-transaction', async () => {
      prisma.order.findUnique.mockResolvedValue(makeStatusOrder('confirmed'));
      tx.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus(merchantUser, 'order-1', makeDto('packed')),
      ).rejects.toEqual(new NotFoundException('Order not found'));
    });
  });
});

function makeDto(status: string): UpdateOrderStatusDto {
  const dto = new UpdateOrderStatusDto();
  dto.status = status;
  return dto;
}
