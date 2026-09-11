/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { MatchingService } from './matching.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';

function getMockWhere(mock: jest.Mock): any {
  return (mock.mock.calls[0] as any[])[0]?.where;
}

function getMockCallArgs(mock: jest.Mock): any {
  return (mock.mock.calls[0] as any[])[0];
}

const mockPrisma = {
  skinAnalysis: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('MatchingService', () => {
  let service: MatchingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPersonalized', () => {
    const userId = 'user-123';

    it('should return generic results when no analysis exists', async () => {
      mockPrisma.skinAnalysis.findFirst.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Test Product',
          slug: 'test-product',
          price: 1000,
          compareAtPrice: null,
          images: ['img.jpg'],
          skinTypes: ['oily'],
          tags: [],
          ingredients: [],
          avgRating: 4.5,
          reviewCount: 10,
          isFeatured: true,
          stockQuantity: 5,
        },
      ]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await service.getPersonalized(userId, {});

      expect(result.source).toBe('generic');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].matchScore).toBeNull();
      expect(result.meta.total).toBe(1);
    });

    it('should return AI results with match scores when analysis exists', async () => {
      mockPrisma.skinAnalysis.findFirst.mockResolvedValue({
        id: 'analysis-1',
        skinType: 'oily',
        completedAt: new Date(),
        conditions: [{ conditionName: 'acne' }],
      });
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Acne Serum',
          slug: 'acne-serum',
          price: 2500,
          compareAtPrice: 3000,
          images: ['img.jpg'],
          skinTypes: ['oily'],
          tags: ['acne'],
          ingredients: ['salicylic_acid'],
          avgRating: 4.7,
          reviewCount: 50,
          isFeatured: true,
          stockQuantity: 10,
        },
      ]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await service.getPersonalized(userId, {});

      expect(result.source).toBe('ai');
      expect(result.data[0].matchScore).toBeGreaterThan(0);
    });

    it('should use cached result on Redis HIT', async () => {
      const cachedResult = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
        source: 'generic',
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await service.getPersonalized(userId, {});

      expect(result).toEqual(cachedResult);
      expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
    });

    it('should apply skin type filter override', async () => {
      mockPrisma.skinAnalysis.findFirst.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.getPersonalized(userId, { skinTypes: 'dry' });

      const where = getMockWhere(mockPrisma.product.findMany);
      expect(where.skinTypes).toEqual({ hasSome: ['dry'] });
    });

    it('should apply price range filter', async () => {
      mockPrisma.skinAnalysis.findFirst.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.getPersonalized(userId, { minPrice: 1000, maxPrice: 5000 });

      const where = getMockWhere(mockPrisma.product.findMany);
      expect(where.price).toEqual({ gte: 1000, lte: 5000 });
    });

    it('should apply ingredients filter', async () => {
      mockPrisma.skinAnalysis.findFirst.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.getPersonalized(userId, {
        ingredients: 'vitamin_c,hyaluronic_acid',
      });

      const where = getMockWhere(mockPrisma.product.findMany);
      expect(where.ingredients).toEqual({
        hasSome: ['vitamin_c', 'hyaluronic_acid'],
      });
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.skinAnalysis.findFirst.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(50);

      const result = await service.getPersonalized(userId, {
        page: 2,
        limit: 10,
      });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(50);
      expect(result.meta.totalPages).toBe(5);

      const findManyCall = getMockCallArgs(mockPrisma.product.findMany);
      expect(findManyCall.skip).toBe(10);
      expect(findManyCall.take).toBe(10);
    });
  });

  describe('getSimilar', () => {
    it('should return similar products from same category', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        categoryId: 'cat-1',
        skinTypes: ['oily'],
      });
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'p2',
          name: 'Similar Product',
          slug: 'similar-product',
          price: 2000,
          compareAtPrice: null,
          images: ['img.jpg'],
          skinTypes: ['oily'],
          tags: [],
          ingredients: [],
          avgRating: 4.0,
          reviewCount: 20,
          isFeatured: false,
          stockQuantity: 5,
        },
      ]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await service.getSimilar('p1');

      expect(result.data).toHaveLength(1);
      expect(result.source).toBeNull();
    });

    it('should return empty array when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const result = await service.getSimilar('nonexistent');

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should exclude source product from results', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        categoryId: 'cat-1',
        skinTypes: ['oily'],
      });
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.getSimilar('p1');

      const where = getMockWhere(mockPrisma.product.findMany);
      expect(where.id).toEqual({ not: 'p1' });
    });
  });

  describe('getHistory', () => {
    const userId = 'user-123';

    it('should return history sessions', async () => {
      mockPrisma.skinAnalysis.findMany.mockResolvedValue([
        {
          id: 'analysis-1',
          completedAt: new Date('2026-08-20'),
          skinType: 'oily',
          conditions: [],
          recommendations: [
            {
              product: {
                id: 'p1',
                name: 'Product 1',
                slug: 'product-1',
                price: 1000,
                images: ['img.jpg'],
              },
              matchScore: 92,
            },
          ],
        },
      ]);
      mockPrisma.skinAnalysis.count.mockResolvedValue(1);

      const result = await service.getHistory(userId);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].products).toHaveLength(1);
      expect(result.data[0].skinTypesUsed).toEqual(['oily']);
    });

    it('should return empty array when no history', async () => {
      mockPrisma.skinAnalysis.findMany.mockResolvedValue([]);
      mockPrisma.skinAnalysis.count.mockResolvedValue(0);

      const result = await service.getHistory(userId);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });
});
