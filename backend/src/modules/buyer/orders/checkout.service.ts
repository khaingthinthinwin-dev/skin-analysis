import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  async getCheckoutData(userId: string) {
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
            merchantId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const checkoutItems = items.map((item) => ({
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      productImage:
        Array.isArray(item.product.images) && item.product.images.length > 0
          ? item.product.images[0]
          : null,
      unitPrice: item.product.price.toString(),
      quantity: item.quantity,
      lineTotal: (
        parseFloat(item.product.price.toString()) * item.quantity
      ).toFixed(2),
      stockQuantity: item.product.stockQuantity,
      isAvailable:
        item.product.isActive && item.product.stockQuantity >= item.quantity,
      merchantId: item.product.merchantId,
    }));

    const subtotal = checkoutItems
      .reduce((sum, item) => sum + parseFloat(item.lineTotal), 0)
      .toFixed(2);

    return {
      items: checkoutItems,
      subtotal,
      discountAmount: '0.00',
      total: subtotal,
      cartId: cart.id,
    };
  }

  async validateCoupon(userId: string, couponCode: string, subtotal: number) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { code: couponCode },
      include: { discountType: true },
    });

    if (!promotion) {
      throw new NotFoundException('Coupon not found');
    }

    if (!promotion.isActive) {
      throw new BadRequestException('Coupon is no longer active');
    }

    const now = new Date();
    if (now < promotion.startsAt || now > promotion.expiresAt) {
      throw new BadRequestException('Coupon has expired or is not yet valid');
    }

    if (promotion.maxUses && promotion.usedCount >= promotion.maxUses) {
      throw new BadRequestException('Coupon has reached maximum usage');
    }

    if (
      promotion.minOrderAmount &&
      subtotal < parseFloat(promotion.minOrderAmount.toString())
    ) {
      throw new BadRequestException(
        `Minimum order amount is ${promotion.minOrderAmount.toString()}`,
      );
    }

    const discountValue = parseFloat(promotion.discountValue.toString());
    const discountType = promotion.discountType.typeCode;
    let discountAmount: number;

    if (discountType === 'percentage') {
      discountAmount = (subtotal * discountValue) / 100;
    } else {
      discountAmount = Math.min(discountValue, subtotal);
    }

    const newTotal = Math.max(subtotal - discountAmount, 0).toFixed(2);

    return {
      discountType,
      discountValue: promotion.discountValue.toString(),
      discountAmount: discountAmount.toFixed(2),
      newTotal,
    };
  }
}
