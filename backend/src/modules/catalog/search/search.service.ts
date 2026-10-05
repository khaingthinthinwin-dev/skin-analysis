import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import {
  ProductQueryDto,
  ProductSummaryDto,
  ProductListResponseDto,
  CategoryNodeDto,
  ProductDetailDto,
  SponsoredAdDto,
  AdPlacement,
} from './dto';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';

function getProductSlugFromTargetUrl(targetUrl: string | null): string | null {
  if (!targetUrl) return null;

  try {
    const pathname = new URL(targetUrl, 'http://localhost').pathname;
    const match = pathname.match(/^\/buyer\/products\/([^/]+)\/?$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async searchProducts(
    query: ProductQueryDto,
  ): Promise<ProductListResponseDto> {
    const cacheKey = this.generateCacheKey(query);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as ProductListResponseDto;
    }

    const where = await this.buildSearchWhere(query);
    const orderBy = this.buildOrderBy(query.sort, query.order);
    const { skip, take } = this.calculatePagination(query.page, query.limit);

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          category: true,
          merchant: { select: { shopName: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const data = products.map((p) => this.serializeProduct(p));
    const meta = this.computeMeta(total, query.page, query.limit);
    const result = { data, meta };

    await this.redis.set(cacheKey, JSON.stringify(result), 120);

    return result;
  }

  async getCategoryTree(): Promise<{ data: CategoryNodeDto[] }> {
    const cached = await this.redis.get('cache:categories');
    if (cached) {
      return JSON.parse(cached) as { data: CategoryNodeDto[] };
    }

    const categories = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const tree = this.buildCategoryTree(categories);
    const result = { data: tree };

    await this.redis.set('cache:categories', JSON.stringify(result), 1800);

    return result;
  }

  async getProductBySlug(slug: string): Promise<{ data: ProductDetailDto }> {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        isActive: true,
        merchant: { licenseStatus: 'approved' },
      },
      include: { category: true, merchant: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const detail: ProductDetailDto = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription ?? '',
      description: product.description,
      price: product.price.toString(),
      compareAtPrice: product.compareAtPrice?.toString() ?? null,
      images: product.images,
      skinTypes: product.skinTypes,
      ingredients: product.ingredients,
      tags: product.tags,
      avgRating: product.avgRating.toString(),
      reviewCount: product.reviewCount,
      stockQuantity: product.stockQuantity,
      isInStock: product.stockQuantity > 0,
      isActive: product.isActive,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
      },
      shop: {
        id: product.merchant.id,
        name: product.merchant.shopName,
        slug: product.merchant.userId,
        isApproved: product.merchant.licenseStatus === 'approved',
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    return { data: detail };
  }

  async findBySlug(slug: string): Promise<{ data: ProductDetailDto }> {
    return this.getProductBySlug(slug);
  }

  async getAdsByPlacement(
    placement: AdPlacement,
  ): Promise<{ data: SponsoredAdDto[] }> {
    const now = new Date();

    const ads = await this.prisma.advertisement.findMany({
      where: {
        feeSetting: { placement },
        approvalStatus: 'approved',
        isActive: true,
        startsAt: { lte: now },
        expiresAt: { gte: now },
        shop: { isApproved: true },
      },
      include: { shop: true, feeSetting: true },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    const data: SponsoredAdDto[] = ads.map((ad) => ({
      id: ad.id,
      placement: ad.feeSetting?.placement ?? '',
      title: ad.title,
      description: ad.content,
      imageUrl: ad.imageUrl,
      sku: ad.sku,
      tier: 'standard',
      approvalStatus: ad.approvalStatus,
      startsAt: ad.startsAt,
      expiresAt: ad.expiresAt,
    }));

    return { data };
  }

  async invalidateProductCache(): Promise<void> {
    const client = this.redis.getClient();
    if (!client) return;
    const keys = await client.keys('cache:products:list:*');
    if (keys.length) {
      await client.del(...keys);
    }
  }

  async invalidateCategoryCache(): Promise<void> {
    await this.redis.del('cache:categories');
  }

  async invalidateAdCache(placement: string): Promise<void> {
    await this.redis.del(`cache:ads:${placement}`);
  }

  private async buildSearchWhere(
    query: ProductQueryDto,
  ): Promise<Prisma.ProductWhereInput> {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      merchant: { licenseStatus: 'approved' },
    };

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { shortDescription: { contains: query.q, mode: 'insensitive' } },
        { tags: { hasSome: [query.q] } },
        { ingredients: { hasSome: [query.q] } },
      ];
    }

    if (query.categoryId) {
      const descendantIds = await this.getCategoryDescendants(query.categoryId);
      where.categoryId = { in: descendantIds };
    }

    if (query.skinTypes?.length) {
      where.skinTypes = { hasEvery: query.skinTypes };
    }

    if (query.ingredients?.length) {
      where.ingredients = { hasSome: query.ingredients };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }

    if (query.rating !== undefined) {
      where.avgRating = { gte: query.rating };
    }

    if (query.tags?.length) {
      where.tags = { hasSome: query.tags };
    }

    return where;
  }

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

  private buildOrderBy(
    sort?: string,
    order?: string,
  ): Prisma.ProductOrderByWithRelationInput {
    const sortFieldMap: Record<string, string> = {
      price: 'price',
      rating: 'avgRating',
      createdAt: 'createdAt',
    };

    const field = sortFieldMap[sort || 'createdAt'] || 'createdAt';
    const direction = order === 'asc' ? 'asc' : 'desc';

    return { [field]: direction };
  }

  private calculatePagination(page?: number, limit?: number) {
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(100, Math.max(1, limit || 20));

    return {
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    };
  }

  private computeMeta(total: number, page?: number, limit?: number) {
    const safePage = page || 1;
    const safeLimit = limit || 20;
    return {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  private generateCacheKey(query: ProductQueryDto): string {
    const normalized = JSON.stringify(query, Object.keys(query).sort());
    const hash = createHash('md5').update(normalized).digest('hex');
    return `cache:products:list:v2:${hash}`;
  }

  private serializeProduct(product: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    price: Prisma.Decimal;
    compareAtPrice: Prisma.Decimal | null;
    images: string[];
    skinTypes: string[];
    tags: string[];
    avgRating: Prisma.Decimal;
    reviewCount: number;
    stockQuantity: number;
    category: { id: string; name: string; slug: string };
    merchant: { shopName: string } | null;
  }): ProductSummaryDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription ?? '',
      price: product.price.toString(),
      compareAtPrice: product.compareAtPrice?.toString() ?? null,
      images: product.images,
      skinTypes: product.skinTypes,
      tags: product.tags,
      avgRating: product.avgRating.toString(),
      reviewCount: product.reviewCount,
      isInStock: product.stockQuantity > 0,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
      },
      shop_name: product.merchant?.shopName ?? null,
    };
  }

  private buildCategoryTree(
    categories: Array<{
      id: string;
      name: string;
      slug: string;
      parentId: string | null;
      iconUrl: string | null;
      sortOrder: number;
    }>,
  ): CategoryNodeDto[] {
    const map = new Map<string, CategoryNodeDto>();
    const roots: CategoryNodeDto[] = [];

    for (const cat of categories) {
      map.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        iconUrl: cat.iconUrl,
        sortOrder: cat.sortOrder,
        children: [],
      });
    }

    for (const cat of categories) {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
