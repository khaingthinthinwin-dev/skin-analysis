import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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

    const effectivePrice = dto.price !== undefined ? dto.price : Number(existing.price);
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
