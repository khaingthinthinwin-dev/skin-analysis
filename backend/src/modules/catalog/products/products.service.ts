import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { DeleteAllProductsDto } from './dto/delete-all-products.dto';
import { ProductQueryDto } from './dto/product-query.dto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
        merchant: {
          select: { id: true, shopName: true, licenseStatus: true },
        },
      },
    });

    const similar = await this.prisma.product.findMany({
      where: { categoryId: product?.categoryId, isActive: true },
      take: 4,
    });

    const result = {
      ...product,
      similar,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  async findAll(userId: string, query: ProductQueryDto) {
    const where: Record<string, unknown> = { merchantId: userId };
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        take: query.limit ?? 10,
        skip: ((query.page ?? 1) - 1) * (query.limit ?? 10),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total };
  }

  async findById(id: string, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, merchantId: userId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async findBySlug(slug: string, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, merchantId: userId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(userId: string, dto: CreateProductDto, imageUrls: string[]) {
    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const product = await this.prisma.product.create({
      data: {
        ...dto,
        merchantId: userId,
        slug,
        images: imageUrls,
      },
    });

    await this.redis.del(`product:detail:${product.id}`);
    return product;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateProductDto,
    newImageUrls: string[],
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id, merchantId: userId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updateData: Record<string, unknown> = { ...dto };
    if (newImageUrls.length > 0) {
      updateData.images = [...(product.images || []), ...newImageUrls];
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
    });

    await this.redis.del(`product:detail:${id}`);
    return updated;
  }

  async updateStock(id: string, userId: string, dto: UpdateStockDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, merchantId: userId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { stockQuantity: dto.stockQuantity },
    });

    await this.redis.del(`product:detail:${id}`);
    return updated;
  }

  async deleteAll(userId: string, _dto: DeleteAllProductsDto) {
    const where: Record<string, unknown> = { merchantId: userId };
    const result = await this.prisma.product.deleteMany({ where });
    return { deleted: result.count };
  }

  async remove(id: string, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, merchantId: userId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.delete({ where: { id } });
    await this.redis.del(`product:detail:${id}`);
    return { success: true };
  }

  async bulkUpdateStatus(userId: string, dto: BulkActionDto) {
    const result = await this.prisma.product.updateMany({
      where: { id: { in: dto.ids }, merchantId: userId },
      data: { isActive: dto.action === 'activate' },
    });
    return { updated: result.count };
  }

  async bulkDelete(userId: string, dto: BulkDeleteDto) {
    const result = await this.prisma.product.deleteMany({
      where: { id: { in: dto.ids }, merchantId: userId },
    });
    return { deleted: result.count };
  }

  async findSimilar(idOrSlug: string, limit = 4) {
    const productId = await this.resolveProductId(idOrSlug);
    if (!productId) {
      throw new NotFoundException('Product not found');
    }
    return this.prisma.product.findMany({
      where: { categoryId: productId, isActive: true },
      take: limit,
    });
  }

  async findReviews(
    idOrSlug: string,
    query?: { page?: number; limit?: number; rating?: number },
  ) {
    const productId = await this.resolveProductId(idOrSlug);
    if (!productId) {
      throw new NotFoundException('Product not found');
    }
    const where = {
      productId,
      ...(query?.rating && { rating: query.rating }),
    };
    const [reviews, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: { user: { select: { id: true, name: true } } },
        take: query?.limit ?? 10,
        skip: (query?.page ?? 1 - 1) * (query?.limit ?? 10),
      }),
      this.prisma.review.count({ where }),
    ]);
    return { items: reviews, total };
  }

  async createReview(
    idOrSlug: string,
    userId: string,
    createReviewDto: { rating: number; title?: string; body?: string },
  ) {
    const productId = await this.resolveProductId(idOrSlug);
    if (!productId) {
      throw new NotFoundException('Product not found');
    }
    const existingReview = await this.prisma.review.findFirst({
      where: { productId, userId },
    });
    if (existingReview) {
      throw new ConflictException('User already reviewed this product');
    }
    const review = await this.prisma.review.create({
      data: {
        productId,
        userId,
        rating: createReviewDto.rating,
        title: createReviewDto.title,
        body: createReviewDto.body,
      },
    });
    await this.redis.del(`product:detail:${productId}`);
    return review;
  }
}
