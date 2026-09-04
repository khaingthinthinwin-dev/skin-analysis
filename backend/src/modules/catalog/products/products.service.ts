import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/product-query.dto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DETAIL_CACHE_TTL = 300;
const SIMILAR_CACHE_TTL = 300;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private async resolveProductId(idOrSlug: string): Promise<string | null> {
    const isUuid = UUID_RE.test(idOrSlug);
    const product = await this.prisma.product.findFirst({
      where: isUuid
        ? { id: idOrSlug, isActive: true }
        : { slug: idOrSlug, isActive: true },
      select: { id: true },
    });
    return product?.id ?? null;
  }

  async getDetail(idOrSlug: string) {
    const productId = await this.resolveProductId(idOrSlug);
    if (!productId) {
      throw new NotFoundException('Product not found');
    }

    const cacheKey = `product:detail:${productId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Record<string, unknown>;
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        merchant: { select: { id: true, shopName: true, licenseStatus: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const now = new Date();
    const promotions = await this.prisma.promotion.findMany({
      where: {
        merchantId: product.merchantId,
        isActive: true,
        startsAt: { lte: now },
        expiresAt: { gte: now },
      },
      select: {
        code: true,
        description: true,
        discountTypeCode: true,
        discountValue: true,
        minOrderAmount: true,
        startsAt: true,
        expiresAt: true,
      },
      orderBy: { discountValue: 'desc' },
      take: 5,
    });

    const ratingGroups = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { productId, isApproved: true },
      _count: { rating: true },
    });

    const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: ratingGroups.find((g) => g.rating === star)?._count.rating ?? 0,
    }));

    const detail = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      price: this.toNumber(product.price),
      compareAtPrice:
        product.compareAtPrice !== null
          ? this.toNumber(product.compareAtPrice)
          : null,
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      images: product.images,
      tags: product.tags,
      skinTypes: product.skinTypes,
      ingredients: product.ingredients,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      avgRating: this.toNumber(product.avgRating),
      reviewCount: product.reviewCount,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      merchant: {
        id: product.merchant.id,
        shopName: product.merchant.shopName,
        licenseStatus: product.merchant.licenseStatus,
      },
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
      },
      promotions: promotions.map((p) => ({
        code: p.code,
        description: p.description,
        discountTypeCode: p.discountTypeCode,
        discountValue: this.toNumber(p.discountValue),
        minOrderAmount:
          p.minOrderAmount !== null ? this.toNumber(p.minOrderAmount) : null,
        startsAt: p.startsAt,
        expiresAt: p.expiresAt,
      })),
      ratingBreakdown,
    };

    await this.redis.set(cacheKey, JSON.stringify(detail), DETAIL_CACHE_TTL);
    return detail;
  }

  async findReviews(idOrSlug: string, query: ReviewQueryDto) {
    const productId = await this.resolveProductId(idOrSlug);
    if (!productId) {
      throw new NotFoundException('Product not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      productId,
      isApproved: true,
    };
    if (query.rating !== undefined) {
      where.rating = query.rating;
    }

    let orderBy:
      | Prisma.ReviewOrderByWithRelationInput
      | Prisma.ReviewOrderByWithRelationInput[] = { createdAt: 'desc' };

    if (query.sort === 'rating_desc') {
      orderBy = [{ rating: 'desc' }, { createdAt: 'desc' }];
    } else if (query.sort === 'rating_asc') {
      orderBy = [{ rating: 'asc' }, { createdAt: 'desc' }];
    }

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        images: r.images,
        isVerifiedPurchase: r.isVerifiedPurchase,
        createdAt: r.createdAt,
        user: {
          id: r.user.id,
          name: r.user.name,
          avatarUrl: r.user.avatarUrl,
        },
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findSimilar(idOrSlug: string, limit: number) {
    const productId = await this.resolveProductId(idOrSlug);
    if (!productId) {
      throw new NotFoundException('Product not found');
    }

    const cacheKey = `product:similar:${productId}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Record<string, unknown>[];
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const items = await this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        isActive: true,
        id: { not: productId },
      },
      orderBy: [
        { isFeatured: 'desc' },
        { avgRating: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        compareAtPrice: true,
        images: true,
        avgRating: true,
        reviewCount: true,
        isFeatured: true,
        merchant: { select: { shopName: true } },
      },
    });

    const result = items.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: this.toNumber(p.price),
      compareAtPrice:
        p.compareAtPrice !== null ? this.toNumber(p.compareAtPrice) : null,
      images: p.images,
      avgRating: this.toNumber(p.avgRating),
      reviewCount: p.reviewCount,
      isFeatured: p.isFeatured,
      merchant: { shopName: p.merchant.shopName },
    }));

    await this.redis.set(cacheKey, JSON.stringify(result), SIMILAR_CACHE_TTL);
    return result;
  }

  async createReview(idOrSlug: string, userId: string, dto: CreateReviewDto) {
    const productId = await this.resolveProductId(idOrSlug);
    if (!productId) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this product');
    }

    const deliveredOrder = await this.prisma.order.findFirst({
      where: {
        buyerId: userId,
        statusCode: 'delivered',
        items: { some: { productId } },
      },
      select: { id: true },
    });
    const isVerifiedPurchase = deliveredOrder !== null;

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          userId,
          productId,
          rating: dto.rating,
          title: dto.title,
          body: dto.body,
          images: dto.images ?? [],
          isVerifiedPurchase,
        },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      const agg = await tx.review.aggregate({
        where: { productId, isApproved: true },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.product.update({
        where: { id: productId },
        data: {
          avgRating: new Prisma.Decimal(agg._avg.rating ?? 0),
          reviewCount: agg._count.rating,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'review.create',
          entityType: 'Review',
          entityId: created.id,
          newValue: {
            productId,
            rating: dto.rating,
            isVerifiedPurchase,
          },
        },
      });

      return created;
    });

    await this.redis.del(`product:detail:${productId}`);

    return {
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      images: review.images,
      isVerifiedPurchase: review.isVerifiedPurchase,
      createdAt: review.createdAt,
      user: {
        id: review.user.id,
        name: review.user.name,
        avatarUrl: review.user.avatarUrl,
      },
    };
  }

  private toNumber(value: Prisma.Decimal | number | null): number {
    if (value === null || value === undefined) {
      return 0;
    }
    return typeof value === 'number' ? value : value.toNumber();
  }
}
