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

import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
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

  describe('getMerchantId (private)', () => {
    it('throws NotFoundException when merchant not found', async () => {
      prisma.merchant.findUnique.mockResolvedValue(null);
      await expect(service.findAll('nonexistent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
    });

    it('returns paginated products', async () => {
      prisma.product.findMany.mockResolvedValue([mockProduct]);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.findAll(mockUserId, {});
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('applies search filter', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll(mockUserId, { search: 'serum' });
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

    it('applies category filter', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll(mockUserId, { categoryId: 'cat-1' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 'cat-1' }),
        }),
      );
    });

    it('applies price range filter', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll(mockUserId, { minPrice: 10, maxPrice: 50 });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 10, lte: 50 },
          }),
        }),
      );
    });

    it('applies sort by price ascending', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll(mockUserId, {
        sortBy: 'price',
        sortOrder: 'asc',
      });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'asc' },
        }),
      );
    });

    it('applies pagination with page and limit', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll(mockUserId, { page: 2, limit: 10 });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('applies skinType filter', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll(mockUserId, { skinType: 'dry' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            skinTypes: { has: 'dry' },
          }),
        }),
      );
    });

    it('applies isActive filter', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll(mockUserId, { isActive: 'true' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('applies isFeatured filter', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll(mockUserId, { isFeatured: 'true' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isFeatured: true }),
        }),
      );
    });

    it('applies sort by rating', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll(mockUserId, {
        sortBy: 'rating',
        sortOrder: 'desc',
      });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { avgRating: 'desc' },
        }),
      );
    });

    it('applies sort by name', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll(mockUserId, {
        sortBy: 'name',
        sortOrder: 'asc',
      });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });
  });

  describe('findBySlug', () => {
    beforeEach(() => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
    });

    it('returns product by slug', async () => {
      prisma.product.findFirst.mockResolvedValue({
        ...mockProduct,
        category: mockCategory,
      });
      const result = await service.findBySlug('hydrating-serum', mockUserId);
      expect(result.slug).toBe('hydrating-serum');
    });

    it('throws NotFoundException for invalid slug', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.findBySlug('nonexistent', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for inactive product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.findBySlug('inactive-slug', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.findFirst.mockResolvedValue(null);
    });

    it('creates product with valid data', async () => {
      prisma.product.create.mockResolvedValue({
        ...mockProduct,
        category: mockCategory,
      });

      const result = await service.create(
        mockUserId,
        {
          name: 'Hydrating Serum',
          shortDescription: 'Serum',
          description: 'Detailed description',
          categoryId: 'cat-1',
          price: 29.99,
          compareAtPrice: 39.99,
          stockQuantity: 50,
        },
        ['/uploads/products/img1.jpg'],
      );

      expect(result.name).toBe('Hydrating Serum');
      expect(prisma.product.create).toHaveBeenCalled();
    });

    it('throws NotFoundException for invalid category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(
        service.create(
          mockUserId,
          {
            name: 'Test',
            shortDescription: 'Test',
            description: 'Test',
            categoryId: 'bad-cat',
            price: 10,
            compareAtPrice: 15,
            stockQuantity: 5,
          },
          ['/uploads/products/img1.jpg'],
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException for duplicate SKU', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create(
          mockUserId,
          {
            name: 'Test',
            shortDescription: 'Test',
            description: 'Test',
            categoryId: 'cat-1',
            sku: 'EXISTING-SKU',
            price: 10,
            compareAtPrice: 15,
            stockQuantity: 5,
          },
          ['/uploads/products/img1.jpg'],
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('generates slug and ensures uniqueness', async () => {
      prisma.product.findFirst
        .mockResolvedValueOnce({ slug: 'hydrating-serum' })
        .mockResolvedValueOnce(null);
      prisma.product.create.mockResolvedValue({
        ...mockProduct,
        slug: 'hydrating-serum-1',
        category: mockCategory,
      });

      const result = await service.create(
        mockUserId,
        {
          name: 'Hydrating Serum',
          shortDescription: 'Serum',
          description: 'Description',
          categoryId: 'cat-1',
          price: 29.99,
          compareAtPrice: 39.99,
          stockQuantity: 50,
        },
        ['/uploads/products/img1.jpg'],
      );

      expect(result.slug).toBe('hydrating-serum-1');
    });

    it('stores image paths', async () => {
      prisma.product.create.mockResolvedValue({
        ...mockProduct,
        images: ['/uploads/products/img1.jpg'],
        category: mockCategory,
      });

      await service.create(
        mockUserId,
        {
          name: 'Test',
          shortDescription: 'Test',
          description: 'Test',
          categoryId: 'cat-1',
          price: 10,
          compareAtPrice: 15,
          stockQuantity: 5,
        },
        ['/uploads/products/img1.jpg'],
      );

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            images: ['/uploads/products/img1.jpg'],
          }),
        }),
      );
    });

    it('uses compareAtPrice when price is not provided', async () => {
      prisma.product.create.mockResolvedValue({
        ...mockProduct,
        price: 39.99,
        compareAtPrice: undefined,
        category: mockCategory,
      });

      await service.create(
        mockUserId,
        {
          name: 'Test',
          shortDescription: 'Test',
          description: 'Test',
          categoryId: 'cat-1',
          compareAtPrice: 39.99,
          stockQuantity: 5,
        },
        ['/uploads/products/img1.jpg'],
      );

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            price: 39.99,
            compareAtPrice: undefined,
          }),
        }),
      );
    });

    it('defaults tags and skinTypes to empty arrays', async () => {
      prisma.product.create.mockResolvedValue({
        ...mockProduct,
        tags: [],
        skinTypes: [],
        ingredients: [],
        category: mockCategory,
      });

      await service.create(
        mockUserId,
        {
          name: 'Test',
          shortDescription: 'Test',
          description: 'Test',
          categoryId: 'cat-1',
          price: 10,
          compareAtPrice: 15,
          stockQuantity: 5,
        },
        ['/uploads/products/img1.jpg'],
      );

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: [],
            skinTypes: [],
            ingredients: [],
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates product with valid data', async () => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
      prisma.product.findFirst
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(null);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        name: 'Updated Name',
        category: mockCategory,
      });

      const result = await service.update(
        mockProductId,
        mockUserId,
        {
          name: 'Updated Name',
          retainedImageUrls: ['/uploads/products/img1.jpg'],
        },
        [],
      );
      expect(result.name).toBe('Updated Name');
    });

    it('throws NotFoundException for non-existent product', async () => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.update('bad-id', mockUserId, { name: 'Test' }, []),
      ).rejects.toThrow(NotFoundException);
    });

    it('regenerates slug when name changes', async () => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
      prisma.product.findFirst
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(null);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        slug: 'test-slug',
        category: mockCategory,
      });

      await service.update(
        mockProductId,
        mockUserId,
        { name: 'New Name', retainedImageUrls: ['/uploads/products/img1.jpg'] },
        [],
      );

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'test-slug' }),
        }),
      );
    });

    it('throws ConflictException for duplicate SKU on update', async () => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
      prisma.product.findFirst
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce({ id: 'other' });
      await expect(
        service.update(
          mockProductId,
          mockUserId,
          {
            sku: 'TAKEN-SKU',
            retainedImageUrls: ['/uploads/products/img1.jpg'],
          },
          [],
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for invalid category on update', async () => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(
        service.update(
          mockProductId,
          mockUserId,
          { categoryId: 'bad-cat' },
          [],
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('does not throw ConflictException when SKU is unchanged', async () => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        category: mockCategory,
      });

      await service.update(
        mockProductId,
        mockUserId,
        {
          sku: mockProduct.sku,
          retainedImageUrls: ['/uploads/products/img1.jpg'],
        },
        [],
      );
    });

    it('throws BadRequestException when compareAtPrice <= price', async () => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      await expect(
        service.update(
          mockProductId,
          mockUserId,
          { price: 50, compareAtPrice: 40 },
          [],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows compareAtPrice > price', async () => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        price: 30,
        compareAtPrice: 50,
        category: mockCategory,
      });

      await expect(
        service.update(
          mockProductId,
          mockUserId,
          {
            price: 30,
            compareAtPrice: 50,
            retainedImageUrls: ['/uploads/products/img1.jpg'],
          },
          [],
        ),
      ).resolves.toBeDefined();
    });

    it('retains old images and adds new ones', async () => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        images: ['/uploads/products/old.jpg', '/uploads/products/new.jpg'],
        category: mockCategory,
      });

      await service.update(
        mockProductId,
        mockUserId,
        { retainedImageUrls: ['/uploads/products/old.jpg'] },
        ['/uploads/products/new.jpg'],
      );

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            images: ['/uploads/products/old.jpg', '/uploads/products/new.jpg'],
          }),
        }),
      );
    });

    it('throws BadRequestException for more than 10 images', async () => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      const manyUrls = Array.from({ length: 10 }, (_, i) => `/img${i}.jpg`);
      await expect(
        service.update(
          mockProductId,
          mockUserId,
          { retainedImageUrls: manyUrls },
          ['/img-new.jpg'],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('handles price set to null', async () => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        price: 39.99,
        compareAtPrice: null,
        category: mockCategory,
      });

      await service.update(
        mockProductId,
        mockUserId,
        {
          price: null,
          compareAtPrice: 39.99,
          retainedImageUrls: ['/uploads/products/img1.jpg'],
        },
        [],
      );

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            price: 39.99,
            compareAtPrice: null,
          }),
        }),
      );
    });
  });

  describe('updateStock', () => {
    beforeEach(() => {
      prisma.merchant.findUnique.mockResolvedValue({ id: mockMerchantId });
    });

    it('updates stock for valid product', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        stockQuantity: 100,
      });

      const result = await service.updateStock(mockProductId, mockUserId, {
        stockQuantity: 100,
      });
      expect(result.stockQuantity).toBe(100);
    });

    it('throws NotFoundException for non-existent product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.updateStock('bad-id', mockUserId, { stockQuantity: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows stock of 0', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        stockQuantity: 0,
      });

      const result = await service.updateStock(mockProductId, mockUserId, {
        stockQuantity: 0,
      });
      expect(result.stockQuantity).toBe(0);
    });
  });
});
