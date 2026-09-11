/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { AdminAdManagementService } from './admin-ad-management.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';

type MockPrisma = Record<string, Record<string, jest.Mock>> & {
  $transaction: jest.Mock;
};

describe('AdminAdManagementService fee settings', () => {
  let service: AdminAdManagementService;
  let prisma: MockPrisma;
  let redis: { del: jest.Mock };

  const activeSetting = {
    id: 'fs1',
    placement: 'homepage_banner',
    tier: 'premium',
    dailyRate: new Prisma.Decimal('10.00'),
    durationDays: 5,
    maxAds: 3,
    isActive: true,
    createdAt: new Date('2024-06-01T00:00:00.000Z'),
    updatedAt: new Date('2024-06-01T00:00:00.000Z'),
  };

  const createdSetting = {
    id: 'fs2',
    placement: 'homepage_banner',
    tier: 'standard',
    dailyRate: new Prisma.Decimal('12.50'),
    durationDays: 7,
    maxAds: 4,
    isActive: true,
    createdAt: new Date('2024-06-01T00:00:00.000Z'),
    updatedAt: new Date('2024-06-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    const $transaction = jest.fn();
    prisma = {
      $transaction,
      advertisement: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      adPayment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      notification: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      adFeeSetting: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      adFeeHistory: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
    } as unknown as MockPrisma;

    prisma.$transaction.mockImplementation(
      async (fn: (tx: MockPrisma) => Promise<unknown>) => fn(prisma),
    );

    redis = { del: jest.fn() };

    service = new AdminAdManagementService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
    );
  });

  it('lists fee settings ordered by placement and tier', async () => {
    prisma.adFeeSetting.findMany.mockResolvedValue([activeSetting]);

    const result = await service.listFeeSettings();

    expect(prisma.adFeeSetting.findMany).toHaveBeenCalledWith({
      orderBy: [{ placement: 'asc' }, { tier: 'asc' }],
    });
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'fs1',
        dailyRate: '10.00',
        durationDays: 5,
        totalFee: '50.00',
        isActive: true,
      }),
    );
  });

  it('creates a fee setting with history old=null and invalidates the packages cache', async () => {
    prisma.adFeeSetting.findUnique.mockResolvedValue(null);
    prisma.adFeeSetting.create.mockResolvedValue(createdSetting);
    prisma.adFeeHistory.create.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.createFeeSetting(
      {
        placement: 'homepage_banner',
        tier: 'standard',
        daily_rate: 12.5,
        duration_days: 7,
        max_ads: 4,
        effective_from: new Date('2024-07-01T00:00:00.000Z'),
        change_reason: 'New pricing',
      },
      'admin1',
    );

    expect(result.id).toBe('fs2');
    expect(result.totalFee).toBe('87.50');
    expect(prisma.adFeeSetting.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        placement: 'homepage_banner',
        tier: 'standard',
        dailyRate: 12.5,
        durationDays: 7,
        maxAds: 4,
        isActive: true,
      }),
    });
    expect(prisma.adFeeHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adFeeSettingId: 'fs2',
        oldDailyRate: null,
        oldDurationDays: null,
        oldMaxAds: null,
        newDailyRate: expect.any(Prisma.Decimal),
        newDurationDays: 7,
        changedBy: 'admin1',
        effectiveFrom: new Date('2024-07-01T00:00:00.000Z'),
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'FEE_CREATED' }),
    });
    expect(redis.del).toHaveBeenCalledWith('cache:ads:packages');
  });

  it('throws 409 when an active setting already exists for the placement/tier', async () => {
    prisma.adFeeSetting.findUnique.mockResolvedValue(activeSetting);

    await expect(
      service.createFeeSetting(
        {
          placement: 'homepage_banner',
          tier: 'premium',
          daily_rate: 5,
          duration_days: 3,
          max_ads: 2,
          effective_from: new Date('2024-07-01T00:00:00.000Z'),
          change_reason: 'dup',
        },
        'admin1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('reactivates an existing inactive row instead of inserting a duplicate', async () => {
    prisma.adFeeSetting.findUnique.mockResolvedValue({
      ...activeSetting,
      isActive: false,
    });
    prisma.adFeeSetting.update.mockResolvedValue(createdSetting);
    prisma.adFeeHistory.create.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.createFeeSetting(
      {
        placement: 'homepage_banner',
        tier: 'standard',
        daily_rate: 12.5,
        duration_days: 7,
        max_ads: 4,
        effective_from: new Date('2024-07-01T00:00:00.000Z'),
        change_reason: 'Reintroduce',
      },
      'admin1',
    );

    expect(prisma.adFeeSetting.create).not.toHaveBeenCalled();
    expect(prisma.adFeeSetting.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'fs1' } }),
    );
    expect(prisma.adFeeHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        oldDailyRate: expect.any(Prisma.Decimal),
        newDailyRate: expect.any(Prisma.Decimal),
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        newValue: expect.objectContaining({ reactivated: true }),
      }),
    });
    expect(result.totalFee).toBe('87.50');
  });

  it('throws 404 when updating a missing fee setting', async () => {
    prisma.adFeeSetting.findUnique.mockResolvedValue(null);

    await expect(
      service.updateFeeSetting(
        'missing',
        {
          daily_rate: 10,
          duration_days: 5,
          max_ads: 3,
          effective_from: new Date('2024-07-01T00:00:00.000Z'),
          change_reason: 'bump',
        },
        'admin1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates a fee setting, snapshots old values to history and audits', async () => {
    prisma.adFeeSetting.findUnique.mockResolvedValue(activeSetting);
    prisma.adFeeSetting.update.mockResolvedValue(createdSetting);
    prisma.adFeeHistory.create.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.updateFeeSetting(
      'fs1',
      {
        daily_rate: 12.5,
        duration_days: 7,
        max_ads: 4,
        effective_from: new Date('2024-07-01T00:00:00.000Z'),
        change_reason: 'Rate bump',
      },
      'admin1',
    );

    expect(result.dailyRate).toBe('12.50');
    expect(prisma.adFeeHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adFeeSettingId: 'fs1',
        oldDailyRate: new Prisma.Decimal('10.00'),
        newDailyRate: new Prisma.Decimal('12.50'),
        oldDurationDays: 5,
        newDurationDays: 7,
        changeReason: 'Rate bump',
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'FEE_UPDATED',
        oldValue: expect.objectContaining({
          dailyRate: '10.00',
          durationDays: 5,
        }),
        newValue: expect.objectContaining({ dailyRate: '12.50' }),
      }),
    });
    expect(redis.del).toHaveBeenCalledWith('cache:ads:packages');
  });

  it('throws 409 when deactivating an already-inactive setting', async () => {
    prisma.adFeeSetting.findUnique.mockResolvedValue({
      ...activeSetting,
      isActive: false,
    });

    await expect(
      service.deactivateFeeSetting('fs1', { change_reason: 'nope' }, 'admin1'),
    ).rejects.toThrow(ConflictException);
  });

  it('deactivates an active setting and writes history', async () => {
    prisma.adFeeSetting.findUnique.mockResolvedValue(activeSetting);
    prisma.adFeeSetting.update.mockResolvedValue({
      ...activeSetting,
      isActive: false,
    });
    prisma.adFeeHistory.create.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.deactivateFeeSetting(
      'fs1',
      { change_reason: 'Retiring tier' },
      'admin1',
    );

    expect(result.isActive).toBe(false);
    expect(prisma.adFeeSetting.update).toHaveBeenCalledWith({
      where: { id: 'fs1' },
      data: { isActive: false },
    });
    expect(prisma.adFeeHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adFeeSettingId: 'fs1',
        oldDailyRate: expect.any(Prisma.Decimal),
        newDailyRate: expect.any(Prisma.Decimal),
        changeReason: 'Retiring tier',
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'FEE_DEACTIVATED',
        newValue: expect.objectContaining({ isActive: false }),
      }),
    });
    expect(redis.del).toHaveBeenCalledWith('cache:ads:packages');
  });

  it('lists fee history with placement filter and pagination', async () => {
    prisma.adFeeHistory.findMany.mockResolvedValue([
      {
        id: 'h1',
        setting: { placement: 'homepage_banner', tier: 'premium' },
        changedByAdmin: { id: 'admin1', name: 'Admin One' },
        oldDailyRate: null,
        newDailyRate: new Prisma.Decimal('10.00'),
        oldDurationDays: null,
        newDurationDays: 5,
        oldMaxAds: null,
        newMaxAds: 3,
        changedBy: 'admin1',
        changeReason: 'Initial',
        effectiveFrom: new Date('2024-06-01T00:00:00.000Z'),
        createdAt: new Date('2024-06-01T00:00:00.000Z'),
      },
    ]);
    prisma.adFeeHistory.count.mockResolvedValue(1);

    const result = await service.listFeeHistory({
      page: 1,
      limit: 20,
      placement: 'homepage_banner',
    });

    expect(prisma.adFeeHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { setting: { placement: 'homepage_banner' } },
        orderBy: { createdAt: 'desc' },
      }),
    );
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'h1',
        placement: 'homepage_banner',
        tier: 'premium',
        oldDailyRate: null,
        newDailyRate: '10.00',
        changedByName: 'Admin One',
      }),
    );
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });
});
