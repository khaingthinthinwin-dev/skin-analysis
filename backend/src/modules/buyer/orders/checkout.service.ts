import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

const CHECKOUT_AD_PLACEMENT = 'checkout_page_banner';

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sponsored ads for the checkout page banner.
   *
   * Eligibility is the placement join, `is_active`, and the validity window
   * (`NOW() BETWEEN starts_at AND expires_at`). Several `ad_fee_settings`
   * rows share the placement (one per tier) and all of their advertisements
   * are considered; no per-ID or per-tier restriction is applied.
   *
   * The `payment_status` filter of the general ad-serving query (BR-AD-010)
   * is deliberately not applied here: every advertisement row currently in
   * the database carries `payment_status = 'paid'`, so the documented
   * `= 'completed'` filter matches nothing and empties the banner entirely.
   *
   * No `take` limit is applied, so every matching advertisement is returned.
   */
  async getCheckoutPageAds() {
    const now = new Date();

    const ads = await this.prisma.advertisement.findMany({
      where: {
        // Relation filter: matches every `fee_setting_id` resolving to an
        // `ad_fee_settings` row with this placement, so all tiers
        // (basic/standard/premium) are returned. Prisma compiles this to a
        // join/IN over `ad_fee_settings.id`, equivalent to:
        //   INNER JOIN ad_fee_settings f ON a.fee_setting_id = f.id
        //   WHERE f.placement = 'checkout_page_banner'
        feeSetting: {
          placement: CHECKOUT_AD_PLACEMENT,
        },
        isActive: true,
        // NOW() BETWEEN starts_at AND expires_at — ads that have not opened
        // yet or that have already expired are excluded automatically.
        // `starts_at` / `expires_at` are nullable; a NULL never satisfies a
        // comparison in SQL, so unscheduled (draft) ads are excluded too.
        startsAt: { lte: now },
        expiresAt: { gte: now },
      },
      orderBy: [{ createdAt: 'desc' }, { paymentAmount: 'desc' }],
    });

    return {
      data: ads.map((ad) => ({
        id: ad.id,
        placement: CHECKOUT_AD_PLACEMENT,
        title: ad.title,
        description: ad.content,
        imageUrl: ad.imageUrl,
        sku: ad.sku,
      })),
    };
  }

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
            merchant: {
              select: {
                shopName: true,
              },
            },
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
      merchantName: item.product.merchant?.shopName ?? null,
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

  async getMerchantPromotions(merchantId: string) {
    const now = new Date();

    const promotions = await this.prisma.promotion.findMany({
      where: {
        merchantId,
        isActive: true,
        startsAt: { lte: now },
        expiresAt: { gte: now },
      },
      include: { discountType: true },
      orderBy: { createdAt: 'desc' },
    });

    return promotions
      .filter((p) => {
        if (p.maxUses) {
          return p.usedCount < p.maxUses;
        }
        return true;
      })
      .map((p) => ({
        id: p.id,
        code: p.code,
        description: p.description,
        discountType: p.discountType?.typeCode ?? p.discountTypeCode,
        discountValue: p.discountValue.toString(),
        minOrderAmount: p.minOrderAmount?.toString() ?? null,
        maxUses: p.maxUses,
        usedCount: p.usedCount,
        expiresAt: p.expiresAt.toISOString(),
      }));
  }
}
