import { MerchantsService } from './merchants.service';
import { NotFoundException } from '@nestjs/common';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const mockPrisma = {
  merchant: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

describe('MerchantsService', () => {
  let service: MerchantsService;

  beforeEach(() => {
    service = new MerchantsService(mockPrisma as never);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated merchants', async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([
        { id: '1', shopName: 'Shop' },
      ]);
      mockPrisma.merchant.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([]);
      mockPrisma.merchant.count.mockResolvedValue(0);

      await service.findAll({ status: 'approved', page: 1, limit: 10 });

      expect(mockPrisma.merchant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ licenseStatus: 'approved' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return merchant by id', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: '1',
        shopName: 'Shop',
      });

      const result = await service.findOne('1');
      expect(result.id).toBe('1');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approve', () => {
    it('should approve merchant', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.merchant.update.mockResolvedValue({});

      await service.approve('1', 'admin-1');

      expect(mockPrisma.merchant.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({ licenseStatus: 'approved' }),
      });
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);

      await expect(service.approve('nonexistent', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reject', () => {
    it('should reject merchant', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.merchant.update.mockResolvedValue({});

      await service.reject('1', 'admin-1', 'Invalid');

      expect(mockPrisma.merchant.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({ licenseStatus: 'rejected' }),
      });
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);

      await expect(
        service.reject('nonexistent', 'admin-1', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
