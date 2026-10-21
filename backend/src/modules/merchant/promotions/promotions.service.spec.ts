import { PromotionsService } from './promotions.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';

type MockPrisma = Record<string, Record<string, jest.Mock>>;

describe('PromotionsService', () => {
  let service: PromotionsService;
  let prisma: MockPrisma;
  let redis: { del: jest.Mock };

  beforeEach(() => {
    prisma = {
      merchant: { findUnique: jest.fn() },
      promotion: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      discountType: { findUnique: jest.fn() },
      user: { findMany: jest.fn() },
      notification: { createMany: jest.fn(), create: jest.fn() },
    };

    redis = { del: jest.fn().mockResolvedValue(1) };

    service = new PromotionsService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
    );
  });

  describe('create', () => {
    const futureStart = new Date('2026-11-01T00:00:00Z');
    const futureEnd = new Date('2026-12-01T00:00:00Z');

    const validDto = {
      code: 'SUMMER20',
      description: 'Summer sale',
      discountTypeCode: 'percentage',
      discountValue: 20,
      startsAt: futureStart.toISOString(),
      expiresAt: futureEnd.toISOString(),
    };

    beforeEach(() => {
      prisma.merchant.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.promotion.findUnique.mockResolvedValue(null);
      prisma.discountType.findUnique.mockResolvedValue({
        typeCode: 'percentage',
      });
      prisma.promotion.create.mockResolvedValue({
        id: 'promo-1',
        merchantId: 'm1',
        code: 'SUMMER20',
        description: 'Summer sale',
        discountTypeCode: 'percentage',
        discountValue: 20,
        minOrderAmount: null,
        maxUses: null,
        usedCount: 0,
        startsAt: futureStart,
        expiresAt: futureEnd,
        isActive: true,
        discountType: { typeCode: 'percentage' },
      });
    });

    it('notifies all active users with PROMO_CREATED when a promotion is created', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-a' },
        { id: 'user-b' },
      ]);
      prisma.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await service.create('merchant-user-1', validDto);

      const expectedMessage = `Use code "SUMMER20" for 20% off. Valid until ${futureEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}.`;
      expect(result.code).toBe('SUMMER20');
      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'user-a',
            type: 'PROMO_CREATED',
            title: 'New Promotion Available',
            message: expectedMessage,
            entityType: 'promotion',
            entityId: 'promo-1',
          },
          {
            userId: 'user-b',
            type: 'PROMO_CREATED',
            title: 'New Promotion Available',
            message: expectedMessage,
            entityType: 'promotion',
            entityId: 'promo-1',
          },
        ],
        skipDuplicates: true,
      });
    });

    it('still creates the promotion when the notification write fails', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'user-a' }]);
      prisma.notification.createMany.mockRejectedValue(new Error('db down'));

      const result = await service.create('merchant-user-1', validDto);

      expect(result.code).toBe('SUMMER20');
      expect(prisma.promotion.create).toHaveBeenCalled();
    });

    it('rejects a fixed discount greater than or equal to the minimum order amount', async () => {
      await expect(
        service.create('merchant-user-1', {
          ...validDto,
          discountTypeCode: 'fixed',
          discountValue: 5000,
          minOrderAmount: 5000,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.promotion.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate promotion code', async () => {
      prisma.promotion.findUnique.mockResolvedValue({
        id: 'existing',
        code: 'SUMMER20',
      });

      await expect(service.create('merchant-user-1', validDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });
  });
});
