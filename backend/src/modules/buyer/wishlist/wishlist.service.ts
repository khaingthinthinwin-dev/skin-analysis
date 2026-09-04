import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async addToWishlist(userId: string, dto: AddToWishlistDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new NotFoundException('Product is not available');
    }

    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: dto.productId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Product already in wishlist');
    }

    const count = await this.prisma.wishlist.count({ where: { userId } });
    if (count >= 100) {
      throw new BadRequestException('Wishlist limit reached (100 items)');
    }

    const wishlistItem = await this.prisma.wishlist.create({
      data: {
        userId,
        productId: dto.productId,
      },
    });

    return {
      id: wishlistItem.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productImage:
        Array.isArray(product.images) && product.images.length > 0
          ? product.images[0]
          : null,
      productPrice: product.price.toString(),
      compareAtPrice: product.compareAtPrice
        ? product.compareAtPrice.toString()
        : null,
      stockStatus: this.calculateStockStatus(product.stockQuantity),
      isInStock: product.stockQuantity > 0,
      createdAt: wishlistItem.createdAt.toISOString(),
    };
  }

  async removeFromWishlist(userId: string, productId: string) {
    const item = await this.prisma.wishlist.findFirst({
      where: {
        userId,
        productId,
      },
    });

    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }

    await this.prisma.wishlist.delete({
      where: { id: item.id },
    });

    return { success: true };
  }

  async getWishlistItems(userId: string) {
    const normalizedUserId = String(userId ?? '').trim();
    console.log(
      '[wishlist.service] getWishlistItems userId:',
      normalizedUserId,
    );

    if (!normalizedUserId || normalizedUserId === 'undefined') {
      console.error(
        '[wishlist.service] Missing/invalid userId for wishlist query',
      );
      return {
        items: [],
        totalCount: 0,
      };
    }

    const items = await this.prisma.wishlist.findMany({
      where: { userId: normalizedUserId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            price: true,
            compareAtPrice: true,
            stockQuantity: true,
            isActive: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('[wishlist.service] raw wishlist rows:', items.length, items);

    const wishlistItems = items.map((item) => ({
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      category: item.product.category?.name ?? 'Uncategorized',
      productSlug: item.product.slug,
      productImage:
        Array.isArray(item.product.images) && item.product.images.length > 0
          ? item.product.images[0]
          : null,
      productPrice: item.product.price.toString(),
      compareAtPrice: item.product.compareAtPrice
        ? item.product.compareAtPrice.toString()
        : null,
      stockStatus: this.calculateStockStatus(item.product.stockQuantity),
      isInStock: item.product.stockQuantity > 0,
      createdAt: item.createdAt.toISOString(),
    }));

    const result = {
      items: wishlistItems,
      totalCount: wishlistItems.length,
    };

    console.log('[wishlist.service] wishlist result:', result);
    return result;
  }

  async moveToCart(userId: string, productId: string) {
    const wishlistItem = await this.prisma.wishlist.findFirst({
      where: { userId, productId },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Wishlist item not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found or unavailable');
    }

    if (product.stockQuantity <= 0) {
      throw new BadRequestException('Product is out of stock');
    }

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const existingCartItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    let cartItem;
    if (existingCartItem) {
      throw new ConflictException('This product is already in cart.');
    } else {
      cartItem = await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity: 1,
        },
      });
    }

    await this.prisma.wishlist.delete({
      where: { id: wishlistItem.id },
    });

    return {
      cartItem: {
        id: cartItem.id,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        productImage:
          Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : null,
        unitPrice: product.price.toString(),
        quantity: cartItem.quantity,
        subtotal: (
          parseFloat(product.price.toString()) * cartItem.quantity
        ).toFixed(2),
        stockQuantity: product.stockQuantity,
        stockStatus: this.calculateStockStatus(product.stockQuantity),
        isAvailable: product.stockQuantity >= cartItem.quantity,
      },
      wishlistRemoved: true,
    };
  }

  async clearAllWishlist(userId: string) {
    const result = await this.prisma.wishlist.deleteMany({
      where: { userId },
    });

    return { success: true, deletedCount: result.count };
  }

  private calculateStockStatus(stockQuantity: number): string {
    if (stockQuantity <= 0) return 'OUT_OF_STOCK';
    if (stockQuantity <= 10) return 'LOW_STOCK';
    return 'IN_STOCK';
  }
}
