import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchProducts(query: SearchQueryDto) {
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
      isFeatured,
    } = query;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(categoryId && { categoryId }),
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

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        isActive: true,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return product;
  }
}
