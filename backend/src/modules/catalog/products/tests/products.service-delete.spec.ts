/* eslint-disable @typescript-eslint/no-unsafe-assignment */
jest.mock('../../../../shared/prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../../../shared/redis/redis.service', () => ({
  RedisService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../../../common/utils/sku.util', () => ({
  generateSku: jest.fn().mockResolvedValue('SKU_001'),
}));
jest.mock('../../../../common/utils/slug.util', () => ({
  generateSlug: jest.fn().mockReturnValue('test-slug'),
}));

import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsService } from '../products.service';

type MockFn = jest.Mock;

interface MockMerchantModel {
  findUnique: MockFn;
}

interface MockProductModel {
  findMany: MockFn;
  findFirst: MockFn;
  findUnique: MockFn;
  count: MockFn;
  create: MockFn;
  update: MockFn;
  updateMany: MockFn;
  delete: MockFn;
}

interface MockCategoryModel {
  findUnique: MockFn;
}

interface MockOrderItemModel {
  findFirst: MockFn;
  findMany: MockFn;
}

interface MockInventoryTransactionModel {
  findFirst: MockFn;
}

interface MockPrismaClient {
  merchant: MockMerchantModel;
  product: MockProductModel;
  category: MockCategoryModel;
  orderItem: MockOrderItemModel;
  inventoryTransaction: MockInventoryTransactionModel;
}

interface MockRedisClient {
  del: MockFn;
}

interface ProductFixture {
  id: string;
  merchantId: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
  images: string[];
  skinTypes: string[];
  ingredients: string[];
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  avgRating: number;
  reviewCount: number;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryFixture {
  id: string;
  name: string;
  slug: string;
}

describe('ProductsService', () => {
  let service: ProductsService;

  let prisma: MockPrismaClient;

  let redis: MockRedisClient;

  const mockMerchantId = 'merchant-1';
  const mockUserId = 'user-1';
  const mockProductId = 'prod-1';

  const mockProduct: ProductFixture = {
    id: mockProductId,
    merchantId: mockMerchantId,
    name: 'Hydrating Serum',
    slug: 'hydrating-serum',
    shortDescription: 'Serum',
    description: 'Detailed description',
    price: 29.99,
    compareAtPrice: 39.99,
    sku: 'HS-001',
    stockQuantity: 50,
    lowStockThreshold: 10,
    images: ['/uploads/products/img1.jpg'],
    skinTypes: ['dry'],
    ingredients: ['Hyaluronic Acid'],
    tags: ['hydrating'],
    isActive: true,
    isFeatured: false,
    avgRating: 0,
    reviewCount: 0,
    categoryId: 'cat-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategory: CategoryFixture = {
    id: 'cat-1',
    name: 'Skincare',
    slug: 'skincare',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      merchant: { findUnique: jest.fn() },
      product: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      category: { findUnique: jest.fn() },
      orderItem: { findFirst: jest.fn(), findMany: jest.fn() },
      inventoryTransaction: { findFirst: jest.fn() },
    };

    redis = { del: jest.fn() };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    service = new (ProductsService as any)(prisma, redis);
  });

  describe('toggleStatus', () => {
    beforeEach(() => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
    });

    it('toggles isActive from true to false', async () => {
      prisma.product.findFirst.mockResolvedValue({
        ...mockProduct,
        isActive: true,
        category: mockCategory,
      });
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        isActive: false,
        category: mockCategory,
      });

      const result = await service.toggleStatus(mockProductId, mockUserId);
      expect(result.isActive).toBe(false);
    });

    it('toggles isActive from false to true', async () => {
      prisma.product.findFirst.mockResolvedValue({
        ...mockProduct,
        isActive: false,
        category: mockCategory,
      });
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        isActive: true,
        category: mockCategory,
      });

      const result = await service.toggleStatus(mockProductId, mockUserId);
      expect(result.isActive).toBe(true);
    });

    it('throws NotFoundException for non-existent product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.toggleStatus('bad-id', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleFeatured', () => {
    beforeEach(() => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
    });

    it('toggles isFeatured', async () => {
      prisma.product.findFirst.mockResolvedValue({
        id: mockProductId,
        isFeatured: false,
      });
      prisma.product.update.mockResolvedValue({
        id: mockProductId,
        isFeatured: true,
      });

      const result = await service.toggleFeatured(mockProductId, mockUserId);
      expect(result.isFeatured).toBe(true);
    });

    it('throws NotFoundException for non-existent product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.toggleFeatured('bad-id', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove (soft delete)', () => {
    beforeEach(() => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
    });

    it('soft deletes product with no active orders', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.orderItem.findFirst.mockResolvedValue(null);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        isActive: false,
      });

      await service.remove(mockProductId, mockUserId);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: mockProductId },
        data: { isActive: false },
      });
    });

    it('throws NotFoundException for non-existent product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.remove('bad-id', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException for product with active orders (pending)', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.orderItem.findFirst.mockResolvedValue({ id: 'order-1' });

      await expect(service.remove(mockProductId, mockUserId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('soft deletes product with delivered orders only', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.orderItem.findFirst.mockResolvedValue(null);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        isActive: false,
      });

      await service.remove(mockProductId, mockUserId);
      expect(prisma.product.update).toHaveBeenCalled();
    });
  });

  describe('hardDelete', () => {
    beforeEach(() => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
    });

    it('permanently deletes product with no order history', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.orderItem.findFirst.mockResolvedValue(null);
      prisma.inventoryTransaction.findFirst.mockResolvedValue(null);
      prisma.product.delete.mockResolvedValue(mockProduct);

      const result = await service.hardDelete(mockProductId, mockUserId);
      expect(result.message).toBe('Product permanently deleted');
      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: mockProductId },
      });
    });

    it('throws NotFoundException for non-existent product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.hardDelete('bad-id', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException for product with order history', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.orderItem.findFirst.mockResolvedValue({ id: 'oi-1' });

      await expect(
        service.hardDelete(mockProductId, mockUserId),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException for product with inventory transactions', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.orderItem.findFirst.mockResolvedValue(null);
      prisma.inventoryTransaction.findFirst.mockResolvedValue({ id: 'inv-1' });

      await expect(
        service.hardDelete(mockProductId, mockUserId),
      ).rejects.toThrow(ConflictException);
    });

    it('clears redis cache on hard delete', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.orderItem.findFirst.mockResolvedValue(null);
      prisma.inventoryTransaction.findFirst.mockResolvedValue(null);
      prisma.product.delete.mockResolvedValue(mockProduct);

      await service.hardDelete(mockProductId, mockUserId);
      expect(redis.del).toHaveBeenCalledWith(
        `cache:product:${mockProduct.slug}`,
      );
    });
  });

  describe('bulkUpdateStatus', () => {
    beforeEach(() => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
    });

    it('activates multiple products', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      prisma.product.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkUpdateStatus(mockUserId, {
        ids: ['p1', 'p2'],
        action: 'activate',
      });
      expect(result.updated).toBe(2);
    });

    it('deactivates multiple products', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      prisma.product.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkUpdateStatus(mockUserId, {
        ids: ['p1', 'p2'],
        action: 'deactivate',
      });
      expect(result.updated).toBe(2);
    });

    it('throws NotFoundException when some products not found', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);

      await expect(
        service.bulkUpdateStatus(mockUserId, {
          ids: ['p1', 'p2'],
          action: 'activate',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkDelete', () => {
    beforeEach(() => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
    });

    it('soft deletes multiple products', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      prisma.orderItem.findFirst.mockResolvedValue(null);
      prisma.product.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkDelete(mockUserId, {
        ids: ['p1', 'p2'],
      });
      expect(result.deleted).toBe(2);
    });

    it('throws NotFoundException when some products not found', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);

      await expect(
        service.bulkDelete(mockUserId, { ids: ['p1', 'p2'] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException for products with active orders', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      prisma.orderItem.findFirst.mockResolvedValue({ id: 'oi-1' });

      await expect(
        service.bulkDelete(mockUserId, { ids: ['p1', 'p2'] }),
      ).rejects.toThrow(ConflictException);
    });

    it('soft deletes products with no active orders', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);
      prisma.orderItem.findFirst.mockResolvedValue(null);
      prisma.product.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.bulkDelete(mockUserId, { ids: ['p1'] });
      expect(result.deleted).toBe(1);
    });
  });

  describe('deleteAll', () => {
    beforeEach(() => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
    });

    it('deletes all products with no active orders', async () => {
      prisma.product.findMany.mockResolvedValueOnce([
        { id: 'p1' },
        { id: 'p2' },
      ]);
      prisma.orderItem.findMany.mockResolvedValueOnce([]);
      prisma.product.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.deleteAll(mockUserId, {});
      expect(result.deleted).toBe(2);
    });

    it('returns deleted=0 when no products match', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.deleteAll(mockUserId, {});
      expect(result.deleted).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('skips products with active orders', async () => {
      prisma.product.findMany.mockResolvedValueOnce([
        { id: 'p1' },
        { id: 'p2' },
      ]);
      prisma.orderItem.findMany.mockResolvedValueOnce([{ productId: 'p1' }]);
      prisma.product.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.deleteAll(mockUserId, {});
      expect(result.deleted).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.skippedProductIds).toContain('p1');
    });

    it('applies isActive filter', async () => {
      prisma.product.findMany.mockResolvedValueOnce([{ id: 'p1' }]);
      prisma.orderItem.findMany.mockResolvedValueOnce([]);
      prisma.product.updateMany.mockResolvedValue({ count: 1 });

      await service.deleteAll(mockUserId, { isActive: 'true' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('applies search filter', async () => {
      prisma.product.findMany.mockResolvedValueOnce([]);

      await service.deleteAll(mockUserId, { search: 'serum' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'serum', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });
});
