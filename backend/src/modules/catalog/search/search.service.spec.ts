import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { AdPlacement } from './dto';
import { SearchService } from './search.service';

describe('SearchService product search', () => {
  it('returns the merchant shop name with each product summary', async () => {
    const product = {
      id: 'product-1',
      name: 'Glow Serum',
      slug: 'glow-serum',
      shortDescription: 'Brightening serum',
      price: '12000',
      compareAtPrice: null,
      images: [],
      skinTypes: [],
      tags: [],
      avgRating: '4.5',
      reviewCount: 12,
      stockQuantity: 4,
      category: { id: 'category-1', name: 'Serums', slug: 'serums' },
      merchant: { shopName: 'Skin Pure Store' },
    };
    const findMany = jest.fn().mockResolvedValue([product]);
    const count = jest.fn().mockResolvedValue(1);
    const get = jest.fn().mockResolvedValue(null);
    const prisma = {
      product: { findMany, count },
      $transaction: jest
        .fn()
        .mockImplementation((operations: Promise<unknown>[]) =>
          Promise.all(operations),
        ),
    } as unknown as PrismaService;
    const redis = {
      get,
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as RedisService;
    const service = new SearchService(prisma, redis);

    const result = await service.searchProducts({});

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          category: true,
          merchant: { select: { shopName: true } },
        },
      }),
    );
    expect(result.data[0].shop_name).toBe('Skin Pure Store');
  });
});

describe('SearchService sponsored ads', () => {
  it('filters by stored placement and returns the stored placement', async () => {
    const ad = {
      id: 'ad-search',
      feeSetting: { placement: AdPlacement.SEARCH_PAGE_BANNER },
      title: 'Search banner',
      content: null,
      imageUrl: null,
      linkUrl: '/buyer/products/product-123',
      approvalStatus: 'approved',
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
      expiresAt: new Date('2026-09-30T23:59:59.000Z'),
    };
    let findManyArgs: Prisma.AdvertisementFindManyArgs | undefined;
    const findMany = jest.fn((args: Prisma.AdvertisementFindManyArgs) => {
      findManyArgs = args;
      return Promise.resolve([ad]);
    });
    const get = jest.fn().mockResolvedValue(null);
    const prisma = {
      advertisement: { findMany },
    } as unknown as PrismaService;
    const redis = {
      get,
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as RedisService;
    const service = new SearchService(prisma, redis);

    const result = await service.getAdsByPlacement(
      AdPlacement.SEARCH_PAGE_BANNER,
    );

    expect(findMany).toHaveBeenCalledTimes(1);
    if (!findManyArgs) {
      throw new Error('Expected advertisement query arguments');
    }
    expect(findManyArgs.where).toMatchObject({
      feeSetting: { placement: AdPlacement.SEARCH_PAGE_BANNER },
      approvalStatus: 'approved',
      isActive: true,
    });
    const startsAtFilter = findManyArgs.where.startsAt;
    const expiresAtFilter = findManyArgs.where.expiresAt;
    if (
      !startsAtFilter ||
      startsAtFilter instanceof Date ||
      !expiresAtFilter ||
      expiresAtFilter instanceof Date
    ) {
      throw new Error('Expected advertisement date filters');
    }
    expect(startsAtFilter.lte).toBeInstanceOf(Date);
    expect(expiresAtFilter.gte).toBeInstanceOf(Date);
    expect(findManyArgs.include?.feeSetting).toBe(true);
    expect(result.data[0].placement).toBe(AdPlacement.SEARCH_PAGE_BANNER);
    expect(result.data[0].productSlug).toBe('product-123');
    expect(result.data[0].productId).toBe('product-123');
    expect(result.data[0].product_id).toBe('product-123');
    expect(result.data[0].target_url).toBe('/buyer/products/product-123');
    expect(get).not.toHaveBeenCalled();
  });
});
