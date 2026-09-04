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
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { DeleteAllProductsDto } from './dto/delete-all-products.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { generateSlug } from '../../../common/utils/slug.util';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getMerchantId(userId: string): Promise<string> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }
    return merchant.id;
  }

  private async ensureSlugUnique(
    slug: string,
    merchantId: string,
    excludeId?: string,
  ): Promise<string> {
    let candidate = slug;
    let counter = 1;
    while (true) {
      const existing = await this.prisma.product.findFirst({
        where: {
          slug: candidate,
          merchantId,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      if (!existing) return candidate;
      candidate = `${slug}-${counter}`;
      counter++;
    }
  }

  async findAll(userId: string, query: ProductQueryDto) {
    const merchantId = await this.getMerchantId(userId);

    const {
      search,
      categoryId,
      skinType,
      minPrice,
      maxPrice,
      sortBy = 'newest',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      isActive: rawIsActive,
      isFeatured: rawIsFeatured,
    } = query;

    const isActive =
      rawIsActive === 'true'
        ? true
        : rawIsActive === 'false'
          ? false
          : undefined;
    const isFeatured =
      rawIsFeatured === 'true'
        ? true
        : rawIsFeatured === 'false'
          ? false
          : undefined;

    const where: Prisma.ProductWhereInput = {
      merchantId,
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ],
      }),
      ...(skinType && { skinTypes: { has: skinType } }),
      ...(minPrice !== undefined && { price: { gte: minPrice } }),
      ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
      switch (sortBy) {
        case 'price':
          return { price: sortOrder as Prisma.SortOrder };
        case 'rating':
          return { avgRating: sortOrder as Prisma.SortOrder };
        case 'name':
          return { name: sortOrder as Prisma.SortOrder };
        case 'newest':
        default:
          return { createdAt: sortOrder as Prisma.SortOrder };
      }
    })();

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          price: true,
          compareAtPrice: true,
          sku: true,
          stockQuantity: true,
          images: true,
          tags: true,
          skinTypes: true,
          isActive: true,
          isFeatured: true,
          avgRating: true,
          reviewCount: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, userId: string) {
    const merchantId = await this.getMerchantId(userId);

    const product = await this.prisma.product.findFirst({
      where: { id, merchantId },
      include: {
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
    return product;
  }

  async findBySlug(slug: string, userId: string) {
    const merchantId = await this.getMerchantId(userId);

    const product = await this.prisma.product.findFirst({
      where: { slug, merchantId },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async create(userId: string, dto: CreateProductDto, images: string[]) {
    const merchantId = await this.getMerchantId(userId);

    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: { sku: dto.sku },
      });
      if (existingSku) {
        throw new ConflictException('A product with this SKU already exists');
      }
    }

    const baseSlug = generateSlug(dto.name);
    const slug = await this.ensureSlugUnique(baseSlug, merchantId);

    const product = await this.prisma.product.create({
      data: {
        merchantId,
        name: dto.name,
        slug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        sku: dto.sku,
        stockQuantity: dto.stockQuantity,
        lowStockThreshold: dto.lowStockThreshold,
        images,
        tags: dto.tags || [],
        skinTypes: dto.skinTypes || [],
        ingredients: dto.ingredients || [],
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
        avgRating: 0,
        reviewCount: 0,
        categoryId: dto.categoryId,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return product;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateProductDto,
    newImages: string[],
  ) {
    const merchantId = await this.getMerchantId(userId);

    const existing = await this.prisma.product.findFirst({
      where: { id, merchantId },
    });
    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    if (dto.sku && dto.sku !== existing.sku) {
      const existingSku = await this.prisma.product.findFirst({
        where: { sku: dto.sku, id: { not: id } },
      });
      if (existingSku) {
        throw new ConflictException('A product with this SKU already exists');
      }
    }

    const effectivePrice =
      dto.price !== undefined ? dto.price : Number(existing.price);
    if (
      dto.compareAtPrice !== undefined &&
      dto.compareAtPrice !== null &&
      dto.compareAtPrice <= effectivePrice
    ) {
      throw new BadRequestException(
        'Compare price must be greater than selling price',
      );
    }

    let slug = existing.slug;
    if (dto.name && dto.name !== existing.name) {
      const baseSlug = generateSlug(dto.name);
      slug = await this.ensureSlugUnique(baseSlug, merchantId, id);
    }

    const retainedUrls = dto.retainedImageUrls || [];
    const finalImages = [...retainedUrls, ...newImages];

    if (finalImages.length > 10) {
      throw new BadRequestException('A product can have at most 10 images');
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(slug !== existing.slug && { slug }),
        ...(dto.shortDescription !== undefined && {
          shortDescription: dto.shortDescription,
        }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.compareAtPrice !== undefined && {
          compareAtPrice: dto.compareAtPrice,
        }),
        ...(dto.sku !== undefined && { sku: dto.sku }),
        ...(dto.stockQuantity !== undefined && {
          stockQuantity: dto.stockQuantity,
        }),
        ...(dto.lowStockThreshold !== undefined && {
          lowStockThreshold: dto.lowStockThreshold,
        }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.skinTypes !== undefined && { skinTypes: dto.skinTypes }),
        ...(dto.ingredients !== undefined && { ingredients: dto.ingredients }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.retainedImageUrls !== undefined && { images: finalImages }),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return product;
  }

  async updateStock(id: string, userId: string, dto: UpdateStockDto) {
    const merchantId = await this.getMerchantId(userId);

    const existing = await this.prisma.product.findFirst({
      where: { id, merchantId },
    });
    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: { stockQuantity: dto.stockQuantity },
    });

    return product;
  }

  async remove(id: string, userId: string) {
    const merchantId = await this.getMerchantId(userId);

    const existing = await this.prisma.product.findFirst({
      where: { id, merchantId },
    });
    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    const activeOrders = await this.prisma.orderItem.findFirst({
      where: {
        productId: id,
        order: {
          status: {
            isTerminalState: false,
          },
        },
      },
    });

    if (activeOrders) {
      throw new ConflictException(
        'Cannot delete product with active orders. All orders must be completed first.',
      );
    }

    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async bulkUpdateStatus(userId: string, dto: BulkActionDto) {
    const merchantId = await this.getMerchantId(userId);

    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.ids }, merchantId },
    });

    if (products.length !== dto.ids.length) {
      throw new NotFoundException('Some products were not found');
    }

    const updated = await this.prisma.product.updateMany({
      where: { id: { in: dto.ids }, merchantId },
      data: { isActive: dto.action === 'activate' },
    });

    return { updated: updated.count };
  }

  async bulkDelete(userId: string, dto: BulkDeleteDto) {
    const merchantId = await this.getMerchantId(userId);

    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.ids }, merchantId },
    });

    if (products.length !== dto.ids.length) {
      throw new NotFoundException('Some products were not found');
    }

    const activeOrders = await this.prisma.orderItem.findFirst({
      where: {
        productId: { in: dto.ids },
        order: {
          status: {
            isTerminalState: false,
          },
        },
      },
    });

    if (activeOrders) {
      throw new ConflictException('Cannot delete products with active orders.');
    }

    const deleted = await this.prisma.product.updateMany({
      where: { id: { in: dto.ids }, merchantId },
      data: { isActive: false },
    });

    return { deleted: deleted.count };
  }

  async deleteAll(userId: string, dto: DeleteAllProductsDto) {
    const merchantId = await this.getMerchantId(userId);

    const isActive =
      dto.isActive === 'true'
        ? true
        : dto.isActive === 'false'
          ? false
          : undefined;

    const where: Prisma.ProductWhereInput = {
      merchantId,
      ...(isActive !== undefined && { isActive }),
      ...(dto.search && {
        OR: [
          { name: { contains: dto.search, mode: 'insensitive' } },
          { sku: { contains: dto.search, mode: 'insensitive' } },
          { description: { contains: dto.search, mode: 'insensitive' } },
          { tags: { has: dto.search } },
        ],
      }),
    };

    const products = await this.prisma.product.findMany({
      where,
      select: { id: true },
    });

    if (products.length === 0) {
      return { deleted: 0, skipped: 0, skippedProductIds: [] as string[] };
    }

    const productIds = products.map((p) => p.id);

    const activeOrderItems = await this.prisma.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: {
          status: {
            isTerminalState: false,
          },
        },
      },
      select: { productId: true },
    });

    const skippedIds = new Set(activeOrderItems.map((item) => item.productId));
    const idsToDelete = productIds.filter((id) => !skippedIds.has(id));

    if (idsToDelete.length > 0) {
      await this.prisma.product.updateMany({
        where: { id: { in: idsToDelete } },
        data: { isActive: false },
      });
    }

    return {
      deleted: idsToDelete.length,
      skipped: skippedIds.size,
      skippedProductIds: Array.from(skippedIds),
    };
  }
}
