import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { MatchQueryDto } from './dto/match-query.dto';
import {
  RecommendationResultDto,
  RecommendationResponseDto,
  SimilarProductsResponseDto,
} from './dto/recommendation-result.dto';
import {
  HistoryResponseDto,
  HistorySessionDto,
} from './dto/history-response.dto';
import type { Product, Prisma, Merchant } from '@prisma/client';

interface PersonalizationContext {
  source: 'ai' | 'generic';
  skinTypes: string[];
  skinConcerns: string[];
  analysisAge: number | null;
}

interface ScoreComponents {
  skinTypeScore: number;
  concernScore: number;
  ratingScore: number;
  featuredBoost: number;
  total: number;
}

type ProductWithMerchant = Product & {
  merchant: Pick<Merchant, 'shopName'> | null;
};

const CACHE_TTL = 5 * 60;
const SIMILAR_LIMIT_DEFAULT = 8;

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getPersonalized(
    userId: string,
    query: MatchQueryDto,
  ): Promise<RecommendationResponseDto> {
    const {
      skinTypes: skinTypesFilter,
      ingredients: ingredientsFilter,
      minPrice,
      maxPrice,
      sort = 'matchScore',
      order = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const context = await this.determineSource(userId);
    const effectiveSkinTypes = skinTypesFilter
      ? skinTypesFilter.split(',').filter(Boolean)
      : context.skinTypes;

    const cacheKey = this.buildCacheKey(userId, query);
    const cached = await this.getCachedRecommendations(cacheKey);
    if (cached) {
      return cached;
    }

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      merchant: { user: { shop: { isApproved: true } } },
    };

    if (effectiveSkinTypes.length > 0) {
      where.skinTypes = { hasSome: effectiveSkinTypes };
    }

    if (ingredientsFilter) {
      const ingredients = ingredientsFilter.split(',').filter(Boolean);
      if (ingredients.length > 0) {
        where.ingredients = { hasSome: ingredients };
      }
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const orderBy = this.buildOrderBy(sort, order, context.source);

    const skip = (page - 1) * limit;

    const [rawProducts, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          merchant: {
            select: { shopName: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const products = rawProducts as unknown as ProductWithMerchant[];

    const data: RecommendationResultDto[] = products.map((product) => {
      const matchScore =
        context.source === 'ai'
          ? this.computeMatchScore(
              product,
              effectiveSkinTypes[0] || '',
              context.skinConcerns,
            ).total
          : null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        brandName: product.merchant?.shopName ?? '',
        shortDescription: product.shortDescription ?? null,
        price: product.price.toString(),
        compareAtPrice: product.compareAtPrice?.toString() ?? null,
        images: product.images,
        skinTypes: product.skinTypes,
        avgRating: product.avgRating.toString(),
        reviewCount: product.reviewCount,
        isFeatured: product.isFeatured,
        isInStock: product.stockQuantity > 0,
        matchScore,
        categoryBadge: this.getCategoryBadge(product),
      };
    });

    if (context.source === 'ai' && sort === 'matchScore') {
      data.sort((a, b) => {
        const scoreA = a.matchScore ?? 0;
        const scoreB = b.matchScore ?? 0;
        return order === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      });
    }

    const totalPages = Math.ceil(total / limit);

    const result: RecommendationResponseDto = {
      data,
      meta: { page, limit, total, totalPages },
      source: context.source,
      analysisAge: context.analysisAge,
      skinTypes: context.skinTypes,
    };

    await this.cacheRecommendations(cacheKey, result);

    return result;
  }

  async getSimilar(
    productId: string,
    limit: number = SIMILAR_LIMIT_DEFAULT,
  ): Promise<SimilarProductsResponseDto> {
    const sourceProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, categoryId: true, skinTypes: true },
    });

    if (!sourceProduct) {
      return {
        data: [],
        meta: { page: 1, limit, total: 0, totalPages: 0 },
        source: null,
      };
    }

    const where = {
      isActive: true,
      merchant: { user: { shop: { isApproved: true } } },
      categoryId: sourceProduct.categoryId,
      id: { not: productId },
      ...(sourceProduct.skinTypes.length > 0
        ? { skinTypes: { hasSome: sourceProduct.skinTypes } }
        : {}),
    };

    const [rawSimilarProducts, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: {
            select: { shopName: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const similarProducts =
      rawSimilarProducts as unknown as ProductWithMerchant[];

    const data: RecommendationResultDto[] = similarProducts.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      brandName: product.merchant?.shopName ?? '',
      shortDescription: product.shortDescription ?? null,
      price: product.price.toString(),
      compareAtPrice: product.compareAtPrice?.toString() ?? null,
      images: product.images,
      skinTypes: product.skinTypes,
      avgRating: product.avgRating.toString(),
      reviewCount: product.reviewCount,
      isFeatured: product.isFeatured,
      isInStock: product.stockQuantity > 0,
      matchScore: null,
      categoryBadge: this.getCategoryBadge(product),
    }));

    return {
      data,
      meta: { page: 1, limit, total, totalPages: Math.ceil(total / limit) },
      source: null,
    };
  }

  async getHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<HistoryResponseDto> {
    const skip = (page - 1) * limit;

    const [analyses, total] = await Promise.all([
      this.prisma.skinAnalysis.findMany({
        where: {
          userId,
          analysisStatus: 'completed',
          completedAt: { not: null },
        },
        include: {
          conditions: true,
          recommendations: {
            include: { product: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.skinAnalysis.count({
        where: {
          userId,
          analysisStatus: 'completed',
          completedAt: { not: null },
        },
      }),
    ]);

    const data: HistorySessionDto[] = analyses.map((analysis) => ({
      sessionId: analysis.id,
      sessionDate: analysis.completedAt!.toISOString(),
      skinTypesUsed: analysis.skinType ? [analysis.skinType] : [],
      products: analysis.recommendations.map((rec) => ({
        id: rec.product.id,
        name: rec.product.name,
        slug: rec.product.slug,
        price: rec.product.price.toString(),
        images: rec.product.images,
        matchScore: rec.matchScore,
      })),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  private async determineSource(
    userId: string,
  ): Promise<PersonalizationContext> {
    const latestAnalysis = await this.prisma.skinAnalysis.findFirst({
      where: {
        userId,
        analysisStatus: 'completed',
        completedAt: { not: null },
      },
      include: { conditions: true },
      orderBy: { completedAt: 'desc' },
    });

    if (!latestAnalysis) {
      return {
        source: 'generic',
        skinTypes: [],
        skinConcerns: [],
        analysisAge: null,
      };
    }

    const analysisAge =
      (Date.now() - latestAnalysis.completedAt!.getTime()) / (1000 * 60 * 60);

    const skinConcerns = latestAnalysis.conditions.map((c) => c.conditionName);

    return {
      source: 'ai',
      skinTypes: latestAnalysis.skinType ? [latestAnalysis.skinType] : [],
      skinConcerns,
      analysisAge,
    };
  }

  private computeMatchScore(
    product: Product,
    userSkinType: string,
    userConcerns: string[],
  ): ScoreComponents {
    let skinTypeScore = 0;
    if (userSkinType && product.skinTypes.includes(userSkinType)) {
      skinTypeScore = 50;
    } else if (product.skinTypes.length > 0) {
      skinTypeScore = 30;
    }

    let concernScore = 0;
    if (userConcerns.length > 0) {
      const matchedConcerns = userConcerns.filter(
        (concern) =>
          product.tags.some((tag) =>
            tag.toLowerCase().includes(concern.toLowerCase()),
          ) ||
          product.ingredients.some((ing) =>
            ing.toLowerCase().includes(concern.toLowerCase()),
          ),
      );
      concernScore = Math.min(20, matchedConcerns.length * 10);
    }

    const rating = Number(product.avgRating);
    let ratingScore = 0;
    if (rating >= 4.5) ratingScore = 20;
    else if (rating >= 4.0) ratingScore = 15;
    else if (rating >= 3.0) ratingScore = 10;

    const featuredBoost = product.isFeatured ? 10 : 0;

    const total = skinTypeScore + concernScore + ratingScore + featuredBoost;

    return { skinTypeScore, concernScore, ratingScore, featuredBoost, total };
  }

  private getCategoryBadge(
    product: Product,
  ): 'featured' | 'topRated' | 'bestSeller' | 'new' | null {
    if (product.isFeatured) return 'featured';
    if (Number(product.avgRating) >= 4.7 && product.reviewCount >= 100)
      return 'topRated';
    if (product.reviewCount >= 200) return 'bestSeller';
    const daysSinceCreation =
      (Date.now() - new Date(product.createdAt).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSinceCreation <= 30) return 'new';
    return null;
  }

  private buildOrderBy(
    sort: string,
    order: string,
    source: string,
  ):
    | Prisma.ProductOrderByWithRelationInput
    | Prisma.ProductOrderByWithRelationInput[] {
    const direction = order === 'asc' ? ('asc' as const) : ('desc' as const);

    if (source === 'generic') {
      return [{ isFeatured: 'desc' as const }, { avgRating: 'desc' as const }];
    }

    if (sort === 'price') return { price: direction };
    if (sort === 'createdAt') return { createdAt: direction };

    return [{ isFeatured: 'desc' as const }, { avgRating: 'desc' as const }];
  }

  private buildCacheKey(userId: string, query: MatchQueryDto): string {
    const params = JSON.stringify({
      s: query.skinTypes,
      i: query.ingredients,
      mn: query.minPrice,
      mx: query.maxPrice,
      so: query.sort,
      o: query.order,
      p: query.page,
      l: query.limit,
    });
    const hash = Buffer.from(params).toString('base64url').slice(0, 32);
    return `cache:recommendations:user:${userId}:${hash}`;
  }

  private async getCachedRecommendations(
    key: string,
  ): Promise<RecommendationResponseDto | null> {
    const cached = await this.redis.get(key);
    if (!cached) return null;
    try {
      return JSON.parse(cached) as RecommendationResponseDto;
    } catch {
      return null;
    }
  }

  private async cacheRecommendations(
    key: string,
    data: RecommendationResponseDto,
  ): Promise<void> {
    await this.redis.set(key, JSON.stringify(data), CACHE_TTL);
  }
}
