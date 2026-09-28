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

    it('should apply ingredients filter with mapping', async () => {
      mockPrisma.skinAnalysis.findFirst.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.getPersonalized(userId, {
        ingredients: 'vitamin_c,hyaluronic_acid',
      });

      const where = getMockWhere(mockPrisma.product.findMany);
      expect(where.ingredients).toEqual({
        hasSome: ['Vitamin C', 'Hyaluronic Acid'],
      });
    });

    describe('filters', () => {
      function mockGenericSource() {
        mockPrisma.skinAnalysis.findFirst.mockResolvedValue(null);
        mockRedis.get.mockResolvedValue(null);
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.product.count.mockResolvedValue(0);
      }

      function mockAiSource() {
        mockPrisma.skinAnalysis.findFirst.mockResolvedValue({
          id: 'analysis-1',
          skinType: 'oily',
          completedAt: new Date(),
          conditions: [],
        });
        mockRedis.get.mockResolvedValue(null);
      }

      function getCachedKeys(): string[] {
        return (mockRedis.set.mock.calls as unknown as Array<[string]>).map(
          (call) => call[0],
        );
      }

      it('should treat skinTypes=all as no skin-type restriction', async () => {
        mockGenericSource();

        await service.getPersonalized(userId, { skinTypes: 'all' });

        expect(
          getMockWhere(mockPrisma.product.findMany).skinTypes,
        ).toBeUndefined();
      });

      it('should drop the "all" sentinel from a mixed skin-type filter', async () => {
        mockGenericSource();

        await service.getPersonalized(userId, { skinTypes: 'oily,all' });

        expect(getMockWhere(mockPrisma.product.findMany).skinTypes).toEqual({
          hasSome: ['oily'],
        });
      });

      it('should keep the analysed skin type when no skinTypes param is sent', async () => {
        mockAiSource();
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.product.count.mockResolvedValue(0);

        await service.getPersonalized(userId, {});

        expect(getMockWhere(mockPrisma.product.findMany).OR).toEqual([
          { skinTypes: { hasSome: ['oily'] } },
          { skinTypes: { has: 'all' } },
        ]);
      });

      it('should apply the analysed skin types and the selection as two ANDed conditions', async () => {
        mockPrisma.skinAnalysis.findFirst.mockResolvedValue({
          id: 'analysis-1',
          skinType: 'oily,combination',
          completedAt: new Date(),
          conditions: [],
        });
        mockRedis.get.mockResolvedValue(null);
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.product.count.mockResolvedValue(0);

        await service.getPersonalized(userId, { skinTypes: 'oily' });

        expect(getMockWhere(mockPrisma.product.findMany).AND).toEqual([
          {
            OR: [
              { skinTypes: { hasSome: ['oily', 'combination'] } },
              { skinTypes: { has: 'all' } },
            ],
          },
          {
            OR: [
              { skinTypes: { hasSome: ['oily'] } },
              { skinTypes: { has: 'all' } },
            ],
          },
        ]);
      });

      it('should still query the database when the selected skin type is outside the analysis', async () => {
        mockAiSource();
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.product.count.mockResolvedValue(0);

        await service.getPersonalized(userId, { skinTypes: 'dry' });

        // A dry-only product cannot satisfy the analysis condition, but products
        // tagged for every skin type still can, so the grid is not force-empty.
        expect(mockPrisma.product.findMany).toHaveBeenCalled();
        expect(getMockWhere(mockPrisma.product.findMany).AND).toEqual([
          {
            OR: [
              { skinTypes: { hasSome: ['oily'] } },
              { skinTypes: { has: 'all' } },
            ],
          },
          {
            OR: [
              { skinTypes: { hasSome: ['dry'] } },
              { skinTypes: { has: 'all' } },
            ],
          },
        ]);
      });

      it('should keep a product tagged oily + combination for a combination analysis with an oily selection', async () => {
        mockPrisma.skinAnalysis.findFirst.mockResolvedValue({
          id: 'analysis-1',
          skinType: 'combination',
          completedAt: new Date(),
          conditions: [],
        });
        mockRedis.get.mockResolvedValue(null);
        mockPrisma.product.findMany.mockResolvedValue([
          {
            id: 'p1',
            name: 'Oil Control Cleansing Gel',
            slug: 'oil-control-cleansing-gel',
            price: 13000,
            compareAtPrice: null,
            images: [],
            skinTypes: ['oily', 'combination'],
            tags: [],
            ingredients: [],
            avgRating: 4.4,
            reviewCount: 12,
            isFeatured: false,
            stockQuantity: 5,
          },
        ]);
        mockPrisma.product.count.mockResolvedValue(1);

        const result = await service.getPersonalized(userId, {
          skinTypes: 'oily',
        });

        // The product shares "combination" with the analysis result and "oily"
        // with the selection, so both conditions are satisfied by one tag each.
        expect(result.data).toHaveLength(1);
        expect(getMockWhere(mockPrisma.product.findMany).AND).toEqual([
          {
            OR: [
              { skinTypes: { hasSome: ['combination'] } },
              { skinTypes: { has: 'all' } },
            ],
          },
          {
            OR: [
              { skinTypes: { hasSome: ['oily'] } },
              { skinTypes: { has: 'all' } },
            ],
          },
        ]);
      });

      it('should normalize a mixed-case analysed skin type list', async () => {
        mockPrisma.skinAnalysis.findFirst.mockResolvedValue({
          id: 'analysis-1',
          skinType: 'Oily, Combination',
          completedAt: new Date(),
          conditions: [],
        });
        mockRedis.get.mockResolvedValue(null);
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.product.count.mockResolvedValue(0);

        const result = await service.getPersonalized(userId, {});

        expect(result.skinTypes).toEqual(['oily', 'combination']);
        // At least one analysed skin type has to match, and products tagged for
        // every skin type stay compatible with the analysis result.
        expect(getMockWhere(mockPrisma.product.findMany).OR).toEqual([
          { skinTypes: { hasSome: ['oily', 'combination'] } },
          { skinTypes: { has: 'all' } },
        ]);
      });

      it('should AND the analysis skin type condition with the other filters', async () => {
        mockPrisma.skinAnalysis.findFirst.mockResolvedValue({
          id: 'analysis-1',
          skinType: 'oily,combination',
          completedAt: new Date(),
          conditions: [],
        });
        mockRedis.get.mockResolvedValue(null);
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.product.count.mockResolvedValue(0);

        await service.getPersonalized(userId, {
          skinTypes: 'combination',
          minPrice: 1000,
          maxPrice: 5000,
          rating: 4,
          categoryId: 'cat-1',
        });

        const where = getMockWhere(mockPrisma.product.findMany);
        expect(where.AND).toEqual([
          {
            OR: [
              { skinTypes: { hasSome: ['oily', 'combination'] } },
              { skinTypes: { has: 'all' } },
            ],
          },
          {
            OR: [
              { skinTypes: { hasSome: ['combination'] } },
              { skinTypes: { has: 'all' } },
            ],
          },
        ]);
        expect(where.price).toEqual({ gte: 1000, lte: 5000 });
        expect(where.avgRating).toEqual({ gte: 4 });
        expect(where.categoryId).toBe('cat-1');
      });

      it('should still score against the analysed skin type when all skin types are requested', async () => {
        mockAiSource();
        mockPrisma.product.findMany.mockResolvedValue([
          {
            id: 'p1',
            name: 'Oily Skin Serum',
            slug: 'oily-skin-serum',
            price: 1500,
            compareAtPrice: null,
            images: [],
            skinTypes: ['oily'],
            tags: [],
            ingredients: [],
            avgRating: 4.5,
            reviewCount: 20,
            isFeatured: false,
            stockQuantity: 3,
          },
        ]);
        mockPrisma.product.count.mockResolvedValue(1);

        const result = await service.getPersonalized(userId, {
          skinTypes: 'all',
        });

        expect(
          getMockWhere(mockPrisma.product.findMany).skinTypes,
        ).toBeUndefined();
        expect(result.data[0].matchScore).toBeGreaterThan(0);
      });

      it('should filter by categoryId', async () => {
        mockGenericSource();

        await service.getPersonalized(userId, { categoryId: 'cat-1' });

        expect(getMockWhere(mockPrisma.product.findMany).categoryId).toBe(
          'cat-1',
        );
      });

      it('should support the category alias', async () => {
        mockGenericSource();

        await service.getPersonalized(userId, { category: 'cat-2' });

        expect(getMockWhere(mockPrisma.product.findMany).categoryId).toBe(
          'cat-2',
        );
      });

      it('should apply the rating filter as a minimum avgRating', async () => {
        mockGenericSource();

        await service.getPersonalized(userId, { rating: 4.5 });

        expect(getMockWhere(mockPrisma.product.findMany).avgRating).toEqual({
          gte: 4.5,
        });
      });

      it('should combine all filters in one query', async () => {
        mockGenericSource();

        await service.getPersonalized(userId, {
          skinTypes: 'oily,dry',
          ingredients: 'vitamin_c',
          minPrice: 1000,
          maxPrice: 5000,
          rating: 4,
          categoryId: 'cat-1',
        });

        const where = getMockWhere(mockPrisma.product.findMany);
        expect(where.skinTypes).toEqual({ hasSome: ['oily', 'dry'] });
        expect(where.ingredients).toEqual({ hasSome: ['Vitamin C'] });
        expect(where.price).toEqual({ gte: 1000, lte: 5000 });
        expect(where.avgRating).toEqual({ gte: 4 });
        expect(where.categoryId).toBe('cat-1');
      });

      it('should NOT collide cache keys when only the rating filter differs', async () => {
        mockGenericSource();

        await service.getPersonalized(userId, { page: 1, limit: 12 });
        await service.getPersonalized(userId, {
          page: 1,
          limit: 12,
          rating: 4.5,
        });

        const keys = getCachedKeys();
        expect(keys).toHaveLength(2);
        expect(keys[0]).not.toBe(keys[1]);
      });

      it('should NOT collide cache keys when only the category filter differs', async () => {
        mockGenericSource();

        await service.getPersonalized(userId, { page: 1, limit: 12 });
        await service.getPersonalized(userId, {
          page: 1,
          limit: 12,
          categoryId: 'cat-1',
        });

        const keys = getCachedKeys();
        expect(keys).toHaveLength(2);
        expect(keys[0]).not.toBe(keys[1]);
      });

      it('should NOT reuse the entry of an unfiltered request for skinTypes=all', async () => {
        mockAiSource();
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.product.count.mockResolvedValue(0);

        await service.getPersonalized(userId, { page: 1, limit: 12 });
        await service.getPersonalized(userId, {
          page: 1,
          limit: 12,
          skinTypes: 'all',
        });

        const keys = getCachedKeys();
        expect(keys).toHaveLength(2);
        expect(keys[0]).not.toBe(keys[1]);
      });
    });

    describe('sorting', () => {
      function mockGenericSource() {
        mockPrisma.skinAnalysis.findFirst.mockResolvedValue(null);
        mockRedis.get.mockResolvedValue(null);
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.product.count.mockResolvedValue(0);
      }

      function mockAiSource() {
        mockPrisma.skinAnalysis.findFirst.mockResolvedValue({
          id: 'analysis-1',
          skinType: 'oily',
          completedAt: new Date(),
          conditions: [],
        });
        mockRedis.get.mockResolvedValue(null);
      }

      function getOrderBy(): any {
        return getMockCallArgs(mockPrisma.product.findMany).orderBy;
      }

      it('should honour sort=price for generic results', async () => {
        mockGenericSource();

        await service.getPersonalized(userId, { sort: 'price', order: 'asc' });

        expect(getOrderBy()).toEqual({ price: 'asc' });
      });

      it('should honour sort=createdAt for generic results', async () => {
        mockGenericSource();

        await service.getPersonalized(userId, {
          sort: 'createdAt',
          order: 'desc',
        });

        expect(getOrderBy()).toEqual({ createdAt: 'desc' });
      });

      it('should honour sort=rating for generic results', async () => {
        mockGenericSource();

        await service.getPersonalized(userId, {
          sort: 'rating',
          order: 'desc',
        });

        expect(getOrderBy()).toEqual({ avgRating: 'desc' });
      });

      it('should honour sort=rating for AI results', async () => {
        mockAiSource();
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.product.count.mockResolvedValue(0);

        await service.getPersonalized(userId, { sort: 'rating', order: 'asc' });

        expect(getOrderBy()).toEqual({ avgRating: 'asc' });
      });

      it('should fall back to featured + rating when no sort field is requested', async () => {
        mockAiSource();
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.product.count.mockResolvedValue(0);

        await service.getPersonalized(userId, {});

        expect(getOrderBy()).toEqual([
          { isFeatured: 'desc' },
          { avgRating: 'desc' },
        ]);
      });

      it('should sort AI results by match score in the requested direction', async () => {
        mockAiSource();
        mockPrisma.product.findMany.mockResolvedValue([
          {
            id: 'low',
            name: 'Low Match',
            slug: 'low-match',
            price: 1000,
            compareAtPrice: null,
            images: [],
            skinTypes: ['dry'],
            tags: [],
            ingredients: [],
            avgRating: 3.0,
            reviewCount: 5,
            isFeatured: false,
            stockQuantity: 1,
          },
          {
            id: 'high',
            name: 'High Match',
            slug: 'high-match',
            price: 2000,
            compareAtPrice: null,
            images: [],
            skinTypes: ['oily'],
            tags: [],
            ingredients: [],
            avgRating: 4.8,
            reviewCount: 100,
            isFeatured: true,
            stockQuantity: 1,
          },
        ]);
        mockPrisma.product.count.mockResolvedValue(2);

        const desc = await service.getPersonalized(userId, {
          sort: 'matchScore',
          order: 'desc',
        });
        expect(desc.data.map((product) => product.id)).toEqual(['high', 'low']);

        const asc = await service.getPersonalized(userId, {
          sort: 'matchScore',
          order: 'asc',
        });
        expect(asc.data.map((product) => product.id)).toEqual(['low', 'high']);
      });

      it('should leave explicit field sorts untouched for AI results', async () => {
        mockAiSource();
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.product.count.mockResolvedValue(0);

        await service.getPersonalized(userId, { sort: 'price', order: 'desc' });

        expect(getOrderBy()).toEqual({ price: 'desc' });
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

    it('should NOT collide page 1 and page 2 Redis cache keys', async () => {
      mockPrisma.skinAnalysis.findFirst.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(50);

      await service.getPersonalized(userId, { page: 1, limit: 10 });
      await service.getPersonalized(userId, { page: 2, limit: 10 });

      const cachedKeys = (
        mockRedis.set.mock.calls as unknown as Array<[string]>
      ).map((call) => call[0]);
      expect(cachedKeys).toHaveLength(2);
      expect(cachedKeys[0]).not.toBe(cachedKeys[1]);
    });

    it('should NOT collide different page sizes in Redis cache keys', async () => {
      mockPrisma.skinAnalysis.findFirst.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(50);

      await service.getPersonalized(userId, { page: 1, limit: 12 });
      await service.getPersonalized(userId, { page: 1, limit: 24 });

      const cachedKeys = (
        mockRedis.set.mock.calls as unknown as Array<[string]>
      ).map((call) => call[0]);
      expect(cachedKeys).toHaveLength(2);
      expect(cachedKeys[0]).not.toBe(cachedKeys[1]);
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
