import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartQuantityDto } from './dto/update-cart-quantity.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async addToCart(userId: string, dto: AddToCartDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new NotFoundException('Product is not available');
    }

    if (product.stockQuantity <= 0) {
      throw new BadRequestException('Product is out of stock');
    }

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId,
      },
    });

    const quantity = dto.quantity || 1;

    if (existingItem) {
      throw new ConflictException('This product is already in cart.');
    }

    const cartItem = await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        quantity,
      },
    });

    return {
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
    };
  }

  async updateQuantity(
    userId: string,
    cartItemId: string,
    dto: UpdateCartQuantityDto,
  ) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          where: { id: cartItemId },
          include: { product: true },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new NotFoundException('Cart item not found');
    }

    const item = cart.items[0];

    if (dto.quantity > item.product.stockQuantity) {
      throw new BadRequestException(
        `Only ${item.product.stockQuantity} available in stock`,
      );
    }

    const updatedItem = await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: dto.quantity },
    });

    return {
      id: updatedItem.id,
      productId: item.product.id,
      productName: item.product.name,
      productSlug: item.product.slug,
      productImage:
        Array.isArray(item.product.images) && item.product.images.length > 0
          ? item.product.images[0]
          : null,
      unitPrice: item.product.price.toString(),
      quantity: updatedItem.quantity,
      subtotal: (
        parseFloat(item.product.price.toString()) * updatedItem.quantity
      ).toFixed(2),
      stockQuantity: item.product.stockQuantity,
      stockStatus: this.calculateStockStatus(item.product.stockQuantity),
      isAvailable: item.product.stockQuantity >= updatedItem.quantity,
    };
  }

  async removeFromCart(userId: string, cartItemId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          where: { id: cartItemId },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return { success: true };
  }

  async getCartItems(userId: string) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            price: true,
            stockQuantity: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const cartItems = items.map((item) => ({
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      productSlug: item.product.slug,
      productImage:
        Array.isArray(item.product.images) && item.product.images.length > 0
          ? item.product.images[0]
          : null,
      unitPrice: item.product.price.toString(),
      quantity: item.quantity,
      subtotal: (
        parseFloat(item.product.price.toString()) * item.quantity
      ).toFixed(2),
      stockQuantity: item.product.stockQuantity,
      stockStatus: this.calculateStockStatus(item.product.stockQuantity),
      isAvailable:
        item.product.isActive && item.product.stockQuantity >= item.quantity,
    }));

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cartItems
      .reduce((sum, item) => sum + parseFloat(item.subtotal), 0)
      .toFixed(2);
    const shippingEstimate = cartItems.length > 0 ? '0.00' : '0.00';
    const total = (parseFloat(subtotal) + parseFloat(shippingEstimate)).toFixed(
      2,
    );
    const hasOutOfStock = cartItems.some((item) => item.stockQuantity <= 0);
    const hasQuantityExceeded = cartItems.some(
      (item) => item.quantity > item.stockQuantity,
    );
    const hasInactive = cartItems.some(
      (item) => !item.isAvailable && item.stockQuantity > 0,
    );
    const canCheckout =
      !hasOutOfStock &&
      !hasQuantityExceeded &&
      !hasInactive &&
      cartItems.length > 0;

    return {
      items: cartItems,
      summary: {
        totalItems,
        subtotal,
        shippingEstimate,
        total,
        hasOutOfStock,
        canCheckout,
      },
    };
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return { success: true, deletedCount: 0 };
    }

    const result = await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return { success: true, deletedCount: result.count };
  }

  private calculateStockStatus(stockQuantity: number): string {
    if (stockQuantity <= 0) return 'OUT_OF_STOCK';
    if (stockQuantity <= 10) return 'LOW_STOCK';
    return 'IN_STOCK';
  }
}
