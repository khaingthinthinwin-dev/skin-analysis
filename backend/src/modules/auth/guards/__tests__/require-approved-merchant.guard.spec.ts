import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RequireApprovedMerchantGuard } from '../require-approved-merchant.guard';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

describe('RequireApprovedMerchantGuard', () => {
  let guard: RequireApprovedMerchantGuard;
  let prisma: { merchant: { findUnique: jest.Mock } };

  const mockContext = (user?: { id: string; roleCode: string }) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    prisma = { merchant: { findUnique: jest.fn() } };
    guard = new RequireApprovedMerchantGuard(
      prisma as unknown as PrismaService,
    );
  });

  it('allows approved merchant', async () => {
    prisma.merchant.findUnique.mockResolvedValue({ licenseStatus: 'approved' });
    const ctx = mockContext({ id: 'u1', roleCode: 'merchant' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('allows admin user', async () => {
    const ctx = mockContext({ id: 'u1', roleCode: 'admin' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('throws ForbiddenException for pending merchant', async () => {
    prisma.merchant.findUnique.mockResolvedValue({ licenseStatus: 'pending' });
    const ctx = mockContext({ id: 'u1', roleCode: 'merchant' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException for rejected merchant', async () => {
    prisma.merchant.findUnique.mockResolvedValue({
      licenseStatus: 'rejected',
      rejectionReason: 'Missing business license',
    });
    const ctx = mockContext({ id: 'u1', roleCode: 'merchant' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException for merchant not found', async () => {
    prisma.merchant.findUnique.mockResolvedValue(null);
    const ctx = mockContext({ id: 'u1', roleCode: 'merchant' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException for buyer role', async () => {
    const ctx = mockContext({ id: 'u1', roleCode: 'buyer' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user is undefined', async () => {
    const ctx = mockContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
