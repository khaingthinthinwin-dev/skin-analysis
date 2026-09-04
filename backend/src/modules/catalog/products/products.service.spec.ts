import { ProductsService } from './products.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const mockPrisma = {
  product: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  review: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  orderItem: {
    findFirst: jest.fn(),
  },
  order: {
    findFirst: jest.fn(),
  },
  promotion: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(() => {
    service = new ProductsService(mockPrisma as never, mockRedis as never);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDetail', () => {
    it('should return cached product if available', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'product-uuid' });
      const cachedProduct = { id: '1', name: 'Cached Product' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedProduct));

      const result = await service.getDetail('product-1');

      expect(result).toEqual(cachedProduct);
    });

    it('should fetch from DB if not cached', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'product-uuid' });
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.product.findUnique.mockResolvedValue({
        id: '1',
        name: 'Test Product',
        price: 29.99,
        avgRating: 4.5,
        reviewCount: 10,
        merchant: { shopName: 'Test Shop', user: { name: 'Owner' } },
        category: { name: 'Skincare' },
        promotions: [],
        reviews: [],
      });

      const result = await service.getDetail('product-1');

      expect(result).toBeDefined();
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.getDetail('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findReviews', () => {
    it('should return paginated reviews', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.review.findMany.mockResolvedValue([
        {
          id: 'r1',
          rating: 5,
          title: 'Great',
          body: 'Nice',
          createdAt: new Date(),
          user: { id: 'u1', name: 'User', avatarUrl: null },
        },
      ]);
      mockPrisma.review.count.mockResolvedValue(1);

      const result = await service.findReviews('product-1', {
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by rating', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.review.findMany.mockResolvedValue([]);
      mockPrisma.review.count.mockResolvedValue(0);

      await service.findReviews('product-1', { page: 1, limit: 10, rating: 5 });

      expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ rating: 5 }),
        }),
      );
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.findReviews('nonexistent', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findSimilar', () => {
    it('should return cached similar products', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'product-uuid' });
      const cached = [{ id: '2', name: 'Similar Product' }];
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.findSimilar('product-1', 4);

      expect(result).toEqual(cached);
    });

    it('should fetch from DB if not cached', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'product-uuid' });
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.product.findUnique.mockResolvedValue({
        id: '1',
        categoryId: 'cat-1',
        merchant: { shopName: 'Shop' },
      });
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: '2',
          name: 'Similar',
          price: 19.99,
          avgRating: 4.0,
          merchant: { shopName: 'Shop' },
        },
      ]);

      const result = await service.findSimilar('product-1', 4);

      expect(result).toHaveLength(1);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.findSimilar('nonexistent', 4)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createReview', () => {
    it('should create review successfully', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.review.findUnique.mockResolvedValue(null);
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'o1' });
      mockPrisma.orderItem.findFirst.mockResolvedValue({ id: 'oi-1' });
      mockPrisma.$transaction.mockResolvedValue({
        id: 'r1',
        userId: 'user-1',
        productId: '1',
        rating: 5,
        title: 'Great',
        body: 'Love it',
        images: [],
        isVerifiedPurchase: true,
        createdAt: new Date(),
        user: { id: 'user-1', name: 'User', avatarUrl: null },
      });
      mockRedis.del.mockResolvedValue(undefined);

      const result = await service.createReview('product-1', 'user-1', {
        rating: 5,
        title: 'Great',
        body: 'Love it',
      });

      expect(result).toBeDefined();
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.createReview('nonexistent', 'user-1', {
          rating: 5,
          title: 'Great',
          body: 'Love it',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user already reviewed', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.review.findUnique.mockResolvedValue({ id: 'existing-review' });

      await expect(
        service.createReview('product-1', 'user-1', {
          rating: 5,
          title: 'Great',
          body: 'Love it',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
