import { RevenueService } from './revenue.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ForecastService } from './forecast.service';

type MockPrisma = Record<string, Record<string, jest.Mock>>;

describe('RevenueService processPayout', () => {
  let service: RevenueService;
  let prisma: MockPrisma;

  const payout = {
    id: 'po-1',
    merchantId: 'm1',
    status: 'pending',
    totalAmount: '5000.00',
    commissionAmount: '600.00',
    processedBy: null,
    processedAt: null,
    idempotencyKey: null,
  };

  const updatedPayout = {
    id: 'po-1',
    merchantId: 'm1',
    status: 'completed',
    totalAmount: '5000.00',
    commissionAmount: '600.00',
    processedBy: 'admin-1',
    processedAt: new Date('2026-10-19T00:00:00Z'),
    idempotencyKey: 'payout-po-1',
  };

  beforeEach(() => {
    prisma = {
      payout: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: { create: jest.fn() },
      merchant: { findUnique: jest.fn() },
      notification: { create: jest.fn() },
    };

    service = new RevenueService(
      prisma as unknown as PrismaService,
      {} as ForecastService,
    );

    prisma.payout.findUnique.mockResolvedValue(payout);
    prisma.payout.update.mockResolvedValue(updatedPayout);
    prisma.auditLog.create.mockResolvedValue({});
    prisma.merchant.findUnique.mockResolvedValue({
      userId: 'merchant-user-1',
    });
    prisma.notification.create.mockResolvedValue({ id: 'n-1' });
  });

  it('notifies the merchant when the payout is processed', async () => {
    const result = await service.processPayout('po-1', 'admin-1', '127.0.0.1');

    expect(result.status).toBe('completed');
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'merchant-user-1',
        type: 'PAYOUT_COMPLETED',
        title: 'Payout Processed',
        message: 'Your payout of 5000 Ks has been successfully processed.',
        entityType: 'payout',
        entityId: 'po-1',
      },
    });
  });

  it('still completes the payout when the notification write fails', async () => {
    prisma.notification.create.mockRejectedValue(new Error('db down'));

    const result = await service.processPayout('po-1', 'admin-1');

    expect(result.status).toBe('completed');
    expect(prisma.payout.update).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('does not notify when the merchant record is missing', async () => {
    prisma.merchant.findUnique.mockResolvedValue(null);

    const result = await service.processPayout('po-1', 'admin-1');

    expect(result.status).toBe('completed');
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('rejects an already completed payout without notifying', async () => {
    prisma.payout.findUnique.mockResolvedValue({
      ...payout,
      status: 'completed',
    });

    await expect(service.processPayout('po-1', 'admin-1')).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('throws when the payout does not exist', async () => {
    prisma.payout.findUnique.mockResolvedValue(null);

    await expect(service.processPayout('missing', 'admin-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});
