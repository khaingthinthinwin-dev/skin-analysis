import { createHash } from 'crypto';
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

/** Normalized filter values a cached recommendation response depends on. */
interface RecommendationCacheFilters {
  skinTypes: string[];
  ingredients?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  categoryId?: string;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
}

const CACHE_TTL = 5 * 60;
const SIMILAR_LIMIT_DEFAULT = 8;

/** Sentinel the filter panel sends when no skin type is selected. */
const ALL_SKIN_TYPES = 'all';

const INGREDIENT_KEY_MAP: Record<string, string> = {
  hyaluronic_acid: 'Hyaluronic Acid',
  niacinamide: 'Niacinamide',
  salicylic_acid: 'Salicylic Acid',
  vitamin_c: 'Vitamin C',
  retinol: 'Retinol',
  centella_asiatica: 'Centella Asiatica',
};

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
      rating,
      sort,
      order = 'desc',
      page = 1,
      limit = 20,
      categoryId,
      category,
    } = query;

    // Support both categoryId and category for frontend compatibility
    const effectiveCategoryId = categoryId || category;

    const context = await this.determineSource(userId);

    // BR-MATCH-024 defaults: AI results fall back to `matchScore desc` (scored
    // in memory below); generic results keep buildOrderBy's featured/rating
    // fallback, which an absent `sort` selects. A stale `sort=matchScore` URL
    // can outlive the AI analysis that offered it — generic results carry no
    // scores, so mirror the UI and fall back to Newest (createdAt desc).
    let effectiveSort =
      sort ?? (context.source === 'ai' ? 'matchScore' : undefined);
    let effectiveOrder = order;
    if (effectiveSort === 'matchScore' && context.source !== 'ai') {
      effectiveSort = 'createdAt';
      effectiveOrder = 'desc';
    }

    // The filter panel sends `skinTypes=all` when the buyer clears every skin type
    // checkbox, which means "no skin-type selection". Feeding that sentinel to
    // `hasSome` matched no product at all and emptied the grid.
    const requestedSkinTypes = (skinTypesFilter ?? '')
      .split(',')
      .map((type) => type.trim().toLowerCase())
      .filter((type) => type.length > 0 && type !== ALL_SKIN_TYPES);

    // The analysis result supplies the default skin types. An explicit
    // `skinTypes` selection OVERRIDES the analysis-derived types for that
    // query (BR-MATCH-006): picking "Oily" shows every product tagged oily
    // (plus "all"-tagged ones on the AI source) — including analysis
    // recommended products that carry the oily tag.
    // `skinTypes=all` means "no selection at all" and clears both.
    const analysisSkinTypes = context.source === 'ai' ? context.skinTypes : [];

    const effectiveSkinTypes =
      requestedSkinTypes.length > 0
        ? requestedSkinTypes
        : skinTypesFilter === undefined
          ? analysisSkinTypes
          : [];

    // One condition only: the effective types with `hasSome` semantics
    // (BR-MATCH-016). On the AI source, products tagged for every skin type
    // stay compatible with either source of the types.
    const skinTypeConditions: Prisma.ProductWhereInput[] = [];
    if (effectiveSkinTypes.length > 0) {
      skinTypeConditions.push(
        context.source === 'ai'
          ? {
              OR: [
                { skinTypes: { hasSome: effectiveSkinTypes } },
                { skinTypes: { has: ALL_SKIN_TYPES } },
              ],
            }
          : { skinTypes: { hasSome: effectiveSkinTypes } },
      );
    }

    // Recommendations stay personalized even while a skin type is selected, so
    // scoring falls back to the analysed skin type.
    const scoringSkinType = requestedSkinTypes[0] ?? context.skinTypes[0] ?? '';

    // `skinTypes=all` (no selection) still resolves through the analysis result,
    // but keeps its own cache entry instead of sharing the no-parameter one.
    const cacheSkinTypes =
      requestedSkinTypes.length > 0
        ? requestedSkinTypes
        : skinTypesFilter === undefined
          ? context.skinTypes
          : [];

    const cacheKey = this.buildCacheKey(userId, {
      skinTypes: cacheSkinTypes,
      ingredients: ingredientsFilter,
      minPrice,
      maxPrice,
      rating,
      categoryId: effectiveCategoryId,
      // The EFFECTIVE sort, not the raw request: a stale generic `matchScore`
      // resolves to Newest, and two requests that apply the same order must
      // share one cache entry (while AI `matchScore` must not collide with it).
      sort: effectiveSort,
      order: effectiveOrder,
      page,
      limit,
    });
    const cached = await this.getCachedRecommendations(cacheKey);
    if (cached) {
      return cached;
    }

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      merchant: { user: { shop: { isApproved: true } } },
    };

    if (skinTypeConditions.length === 1) {
      Object.assign(where, skinTypeConditions[0]);
    } else if (skinTypeConditions.length > 1) {
      where.AND = skinTypeConditions;
    }

    if (ingredientsFilter) {
      const ingredients = ingredientsFilter
        .split(',')
        .filter(Boolean)
        .map((key) => INGREDIENT_KEY_MAP[key.trim()] ?? key.trim());
      if (ingredients.length > 0) {
        where.ingredients = { hasSome: ingredients };
      }
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (effectiveCategoryId) {
      // Same rule as the search page: picking a parent category also shows the
      // products of its descendants, otherwise a tree selection looks broken.
      const descendantIds =
        await this.getCategoryDescendants(effectiveCategoryId);
      where.categoryId = { in: descendantIds };
    }

    // Rating filter (minimum avgRating)
    if (rating !== undefined) {
      where.avgRating = { gte: rating };
    }

    const orderBy = this.buildOrderBy(effectiveSort, effectiveOrder);

    const skip = (page - 1) * limit;

    // `matchScore` is computed, not a database column (BR-MATCH-025): the whole
    // filtered set has to be scored and sorted before pagination, otherwise each
    // page is re-sorted independently and the order repeats/skips products
    // across pages. DB-level sorts (price / rating / createdAt) keep skip/take.
    const globalMatchSort = effectiveSort === 'matchScore';

    const [rawProducts, filteredTotal] = await Promise.all([
      this.prisma.product.findMany({
        where,
        ...(globalMatchSort ? {} : { skip, take: limit }),
        orderBy,
        include: {
          merchant: {
            select: { shopName: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    const total = filteredTotal;

    const products = rawProducts as unknown as ProductWithMerchant[];

    let data: RecommendationResultDto[] = products.map((product) => {
      const matchScore =
        context.source === 'ai'
          ? this.computeMatchScore(
              product,
              scoringSkinType,
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

    if (globalMatchSort) {
      data.sort((a, b) => {
        const scoreA = a.matchScore ?? 0;
        const scoreB = b.matchScore ?? 0;
        return effectiveOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      });
      data = data.slice(skip, skip + limit);
    }

    // "Newest" (createdAt) follows the DB order strictly: page 1 must show the
    // newest products first with no prepended strip, so the selected order is
    // exactly what the buyer sees (BR-MATCH-025).
    // NOTE: previously-recommended picks are NOT prepended here — they would
    // break strict createdAt ordering. They remain available via the
    // recommendation-history endpoint.

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
            include: {
              product: {
                include: {
                  merchant: { include: { user: { include: { shop: true } } } },
                },
              },
            },
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

    const data: HistorySessionDto[] = analyses.map((analysis) => {
      // Score with the same formula as the recommendations-page badges
      // (computeMatchScore) so history % matches what buyers see there.
      const scoringSkinType =
        (analysis.skinType ?? '')
          .split(',')
          .map((type) => type.trim().toLowerCase())
          .filter((type) => type.length > 0)[0] ?? '';
      const concerns = analysis.conditions.map((c) => c.conditionName);

      // Only products still on sale (active, approved merchant) are listed,
      // highest match first.
      const products = analysis.recommendations
        .filter(
          (rec) =>
            rec.product.isActive &&
            rec.product.merchant?.user?.shop?.isApproved === true,
        )
        .map((rec) => ({
          id: rec.product.id,
          name: rec.product.name,
          slug: rec.product.slug,
          price: rec.product.price.toString(),
          images: rec.product.images,
          matchScore: this.computeMatchScore(
            rec.product,
            scoringSkinType,
            concerns,
          ).total,
        }))
        .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

      return {
        sessionId: analysis.id,
        sessionDate: analysis.completedAt!.toISOString(),
        skinTypesUsed: analysis.skinType ? [analysis.skinType] : [],
        products,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  /** The requested category plus every category nested below it. */
  private async getCategoryDescendants(categoryId: string): Promise<string[]> {
    const descendants: string[] = [categoryId];
    const queue = [categoryId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await this.prisma.category.findMany({
        where: { parentId: currentId },
        select: { id: true },
      });
      for (const child of children) {
        descendants.push(child.id);
        queue.push(child.id);
      }
    }

    return descendants;
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

    // An analysis can report more than one skin type ("oily,combination");
    // keep them as a normalized list so filters can compare against each.
    const skinTypes = (latestAnalysis.skinType ?? '')
      .split(',')
      .map((type) => type.trim().toLowerCase())
      .filter((type) => type.length > 0);

    return {
      source: 'ai',
      skinTypes,
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

  /**
   * Resolve the DB-level `orderBy` for the requested sort field.
   *
   * BR-MATCH-025: `sort` is an allowlist (matchScore | price | rating | createdAt)
   * and the requested field must be honoured for BOTH sources. Previously the
   * `generic` branch returned early, so every sort option silently did nothing
   * for buyers without an AI analysis, and `rating` was never implemented at all
   * (the DTO accepted it, the ordering ignored it).
   *
   * `matchScore` is not a database column — it is computed per product before
   * pagination — so it (and an absent `sort`) falls back to the per-source
   * default candidate window from BR-MATCH-024: featured, then rating. AI
   * results are scored and re-sorted in memory before the page slice.
   */
  private buildOrderBy(
    sort: string | undefined,
    order: string,
  ):
    | Prisma.ProductOrderByWithRelationInput
    | Prisma.ProductOrderByWithRelationInput[] {
    const direction = order === 'asc' ? ('asc' as const) : ('desc' as const);

    if (sort === 'price') return { price: direction };
    if (sort === 'rating') return { avgRating: direction };
    if (sort === 'createdAt') return { createdAt: direction };

    return [{ isFeatured: 'desc' as const }, { avgRating: 'desc' as const }];
  }

  /**
   * Cache key for a recommendation response.
   *
   * EVERY input that changes the result set has to be part of the key: a missing
   * field makes a freshly selected filter return the previously cached, unfiltered
   * page — which looks exactly like "the filter does nothing". `rating` was missing
   * from the key, and the raw `skinTypes` string was used, so `skinTypes=all`
   * (no restriction) and an omitted `skinTypes` (analysis skin type) collided.
   */
  private buildCacheKey(
    userId: string,
    filters: RecommendationCacheFilters,
  ): string {
    const params = JSON.stringify({
      // Sorted so `oily,dry` and `dry,oily` share one entry (same filter).
      s: [...filters.skinTypes].sort(),
      i: filters.ingredients,
      mn: filters.minPrice,
      mx: filters.maxPrice,
      r: filters.rating,
      c: filters.categoryId,
      so: filters.sort,
      o: filters.order,
      p: filters.page,
      l: filters.limit,
    });
    // Full SHA-256 digest of the serialized query. Do NOT truncate: a short
    // key would drop the trailing `p` (page) / `l` (limit) fields whenever the
    // filter JSON exceeds the captured window, making every page collide on
    // the same Redis key and returning the first page for all pagination.
    const hash = createHash('sha256').update(params).digest('hex');
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

  /**
   * Invalidate all recommendation cache entries for a user.
   * Called when a new AI analysis is completed.
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const pattern = `cache:recommendations:user:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.log(
        `Invalidated ${keys.length} recommendation cache entries for user ${userId}`,
      );
    }
  }
}
