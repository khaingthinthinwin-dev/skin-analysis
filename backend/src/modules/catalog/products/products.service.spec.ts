import { ProductsService } from './products.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockPrisma = {
  product: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
  },
  review: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  promotion: {
    findMany: jest.fn(),
  },
  merchant: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockRedis = {
  del: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
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
    it('should return product with promotions and rating breakdown', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'product-uuid',
        slug: 'test-product',
        name: 'Test Product',
        price: 29.99,
        merchantId: 'merchant-1',
        merchant: {
          id: 'merchant-1',
          shopName: 'Test Shop',
          licenseStatus: 'approved',
        },
        category: { id: 'cat-1', name: 'Skincare', slug: 'skincare' },
      });
      mockPrisma.promotion.findMany.mockResolvedValue([]);
      mockPrisma.review.groupBy.mockResolvedValue([]);

      const result = await service.getDetail('test-product');

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Product');
      expect(result.promotions).toEqual([]);
      expect(result.ratingBreakdown).toEqual([
        { star: 5, count: 0 },
        { star: 4, count: 0 },
        { star: 3, count: 0 },
        { star: 2, count: 0 },
        { star: 1, count: 0 },
      ]);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.getDetail('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if merchant not approved', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'product-uuid',
        merchant: {
          id: 'merchant-1',
          shopName: 'Test Shop',
          licenseStatus: 'pending',
        },
      });

      await expect(service.getDetail('test-product')).rejects.toThrow(
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
          images: [],
          isVerifiedPurchase: true,
          createdAt: new Date(),
          user: { id: 'u1', name: 'User' },
        },
      ]);
      mockPrisma.review.count.mockResolvedValue(1);

      const result = await service.findReviews('product-1', {
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.findReviews('nonexistent', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findSimilar', () => {
    it('should return similar products', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'product-uuid',
        categoryId: 'cat-1',
        skinTypes: ['oily', 'combination'],
      });
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: '2',
          name: 'Similar',
          slug: 'similar-product',
          price: 19.99,
          compareAtPrice: 24.99,
          images: [],
          skinTypes: ['oily'],
          avgRating: 4.0,
          reviewCount: 5,
          category: { id: 'cat-1', name: 'Skincare', slug: 'skincare' },
        },
      ]);

      const result = await service.findSimilar('product-1', 4);

      expect(result).toHaveLength(1);
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
      mockPrisma.product.findFirst.mockResolvedValue({
        id: '1',
        merchantId: 'merchant-1',
      });
      mockPrisma.review.findUnique.mockResolvedValue(null);
      mockPrisma.review.create.mockResolvedValue({
        id: 'r1',
        userId: 'user-1',
        productId: '1',
        rating: 5,
        title: 'Great',
        body: 'Love it',
        images: [],
        isVerifiedPurchase: false,
        createdAt: new Date(),
      });
      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 5 },
        _count: { id: 1 },
      });

      const result = await service.createReview('product-1', 'user-1', {
        rating: 5,
        title: 'Great',
        body: 'Love it',
      });

      expect(result).toBeDefined();
      expect(result.rating).toBe(5);
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
