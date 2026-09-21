import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionQueryDto } from './dto/promotion-query.dto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

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

  private async invalidateCache(
    merchantId: string,
    code?: string,
  ): Promise<void> {
    await this.redis.del(`promo:list:${merchantId}`);
    if (code) {
      await this.redis.del(`promo:detail:${code}`);
      await this.redis.del(`promo:quota:${code}`);
    }
  }

  private calculateTtl(expiresAt: Date): number {
    const now = new Date();
    const ttl = Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
    );
    return ttl;
  }

  @Cron('0 2 * * *')
  async cleanupExpiredPromotions(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await this.prisma.promotion.deleteMany({
      where: {
        expiresAt: { lt: sevenDaysAgo },
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Auto-cleanup: deleted ${result.count} expired promotions (older than 7 days)`,
      );
    }
  }

  async findAll(userId: string, query: PromotionQueryDto) {
    const merchantId = await this.getMerchantId(userId);
    const { search, status, sortBy = 'newest', page = 1, limit = 20 } = query;

    const now = new Date();

    const where: Prisma.PromotionWhereInput = {
      merchantId,
      ...(search && {
        code: { contains: search, mode: 'insensitive' },
      }),
      ...(status === 'active' && {
        isActive: true,
        expiresAt: { gt: now },
      }),
      ...(status === 'inactive' && {
        isActive: false,
      }),
      ...(status === 'expired' && {
        expiresAt: { lt: now },
      }),
    };

    const orderBy: Prisma.PromotionOrderByWithRelationInput =
      sortBy === 'oldest'
        ? { createdAt: 'asc' }
        : sortBy === 'code'
          ? { code: 'asc' }
          : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { discountType: true },
      }),
      this.prisma.promotion.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        ...p,
        usedCount: p.usedCount,
        discountType: p.discountType?.typeCode ?? p.discountTypeCode,
        discountValue: p.discountValue.toString(),
        minOrderAmount: p.minOrderAmount?.toString() ?? null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const merchantId = await this.getMerchantId(userId);

    const promotion = await this.prisma.promotion.findFirst({
      where: { id, merchantId },
      include: { discountType: true },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    const usageResult = await this.prisma.order.groupBy({
      by: ['couponCode'],
      where: { couponCode: promotion.code },
      _count: { id: true },
    });
    const realUsedCount = usageResult[0]?._count.id ?? 0;

    return {
      ...promotion,
      usedCount: realUsedCount,
      discountType: promotion.discountType.typeCode,
      discountValue: promotion.discountValue.toString(),
      minOrderAmount: promotion.minOrderAmount?.toString() ?? null,
    };
  }

  async create(userId: string, dto: CreatePromotionDto) {
    const merchantId = await this.getMerchantId(userId);

    const startsAt = new Date(dto.startsAt);
    const expiresAt = new Date(dto.expiresAt);

    if (expiresAt <= startsAt) {
      throw new BadRequestException('Expiry date must be after start date');
    }

    if (dto.discountTypeCode === 'percentage' && dto.discountValue > 100) {
      throw new BadRequestException('Percentage discount must not exceed 100');
    }

    if (
      dto.discountTypeCode === 'fixed' &&
      dto.minOrderAmount != null &&
      dto.discountValue >= dto.minOrderAmount
    ) {
      throw new BadRequestException(
        'Fixed discount cannot be equal to or greater than minimum order amount',
      );
    }

    const existing = await this.prisma.promotion.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('A promotion with this code already exists');
    }

    const discountType = await this.prisma.discountType.findUnique({
      where: { typeCode: dto.discountTypeCode },
    });

    if (!discountType) {
      throw new BadRequestException(
        `Invalid discount type: ${dto.discountTypeCode}`,
      );
    }

    const promotion = await this.prisma.promotion.create({
      data: {
        merchantId,
        code: dto.code,
        description: dto.description,
        discountTypeCode: dto.discountTypeCode,
        discountValue: dto.discountValue,
        minOrderAmount: dto.minOrderAmount,
        maxUses: dto.maxUses,
        startsAt,
        expiresAt,
        isActive: dto.isActive ?? true,
      },
      include: { discountType: true },
    });

    await this.invalidateCache(merchantId, promotion.code);

    return {
      ...promotion,
      discountType: promotion.discountType.typeCode,
      discountValue: promotion.discountValue.toString(),
      minOrderAmount: promotion.minOrderAmount?.toString() ?? null,
    };
  }

  async update(userId: string, id: string, dto: UpdatePromotionDto) {
    const merchantId = await this.getMerchantId(userId);

    const existing = await this.prisma.promotion.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      throw new NotFoundException('Promotion not found');
    }

    const usageResult = await this.prisma.order.groupBy({
      by: ['couponCode'],
      where: { couponCode: existing.code },
      _count: { id: true },
    });
    const realUsedCount = usageResult[0]?._count.id ?? 0;

    if (realUsedCount > 0) {
      throw new ConflictException(
        'Cannot edit a promotion that has already been used',
      );
    }

    if (dto.discountTypeCode) {
      const discountType = await this.prisma.discountType.findUnique({
        where: { typeCode: dto.discountTypeCode },
      });
      if (!discountType) {
        throw new BadRequestException(
          `Invalid discount type: ${dto.discountTypeCode}`,
        );
      }
    }

    if (
      dto.discountTypeCode === 'percentage' &&
      dto.discountValue &&
      dto.discountValue > 100
    ) {
      throw new BadRequestException('Percentage discount must not exceed 100');
    }

    const effectiveType = dto.discountTypeCode || existing.discountTypeCode;
    const effectiveValue =
      dto.discountValue ?? parseFloat(existing.discountValue.toString());
    const effectiveMinOrder =
      dto.minOrderAmount ??
      (existing.minOrderAmount
        ? parseFloat(existing.minOrderAmount.toString())
        : null);

    if (
      effectiveType === 'fixed' &&
      effectiveMinOrder != null &&
      effectiveValue >= effectiveMinOrder
    ) {
      throw new BadRequestException(
        'Fixed discount cannot be equal to or greater than minimum order amount',
      );
    }

    if (dto.startsAt && dto.expiresAt) {
      const startsAt = new Date(dto.startsAt);
      const expiresAt = new Date(dto.expiresAt);
      if (expiresAt <= startsAt) {
        throw new BadRequestException('Expiry date must be after start date');
      }
    }

    const updateData: Prisma.PromotionUpdateInput = {};

    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.discountTypeCode)
      updateData.discountType = { connect: { typeCode: dto.discountTypeCode } };
    if (dto.discountValue !== undefined)
      updateData.discountValue = dto.discountValue;
    if (dto.minOrderAmount !== undefined)
      updateData.minOrderAmount = dto.minOrderAmount;
    if (dto.maxUses !== undefined) updateData.maxUses = dto.maxUses;
    if (dto.startsAt) updateData.startsAt = new Date(dto.startsAt);
    if (dto.expiresAt) updateData.expiresAt = new Date(dto.expiresAt);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: updateData,
      include: { discountType: true },
    });

    await this.invalidateCache(merchantId, promotion.code);

    return {
      ...promotion,
      discountType: promotion.discountType.typeCode,
      discountValue: promotion.discountValue.toString(),
      minOrderAmount: promotion.minOrderAmount?.toString() ?? null,
    };
  }

  async remove(userId: string, id: string) {
    const merchantId = await this.getMerchantId(userId);

    const existing = await this.prisma.promotion.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      throw new NotFoundException('Promotion not found');
    }

    const usageResult = await this.prisma.order.groupBy({
      by: ['couponCode'],
      where: { couponCode: existing.code },
      _count: { id: true },
    });
    const realUsedCount = usageResult[0]?._count.id ?? 0;

    if (realUsedCount > 0) {
      throw new ConflictException(
        'Cannot delete a promotion that has already been used',
      );
    }

    await this.prisma.promotion.delete({ where: { id } });
    await this.invalidateCache(merchantId, existing.code);

    return { deleted: true };
  }

  async toggleActive(userId: string, id: string) {
    const merchantId = await this.getMerchantId(userId);

    const existing = await this.prisma.promotion.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      throw new NotFoundException('Promotion not found');
    }

    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: { discountType: true },
    });

    const usageResult = await this.prisma.order.groupBy({
      by: ['couponCode'],
      where: { couponCode: promotion.code },
      _count: { id: true },
    });
    const realUsedCount = usageResult[0]?._count.id ?? 0;

    await this.invalidateCache(merchantId, promotion.code);

    return {
      ...promotion,
      usedCount: realUsedCount,
      discountType: promotion.discountType.typeCode,
      discountValue: promotion.discountValue.toString(),
      minOrderAmount: promotion.minOrderAmount?.toString() ?? null,
    };
  }

  async validateCoupon(userId: string, couponCode: string, subtotal: number) {
    const merchantId = await this.getMerchantId(userId);

    const promotion = await this.prisma.promotion.findFirst({
      where: { code: couponCode, merchantId },
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

    const usageResult = await this.prisma.order.groupBy({
      by: ['couponCode'],
      where: { couponCode: promotion.code },
      _count: { id: true },
    });
    const realUsedCount = usageResult[0]?._count.id ?? 0;

    if (promotion.maxUses && realUsedCount >= promotion.maxUses) {
      throw new BadRequestException('Coupon has reached maximum usage');
    }

    if (
      promotion.minOrderAmount &&
      subtotal < parseFloat(promotion.minOrderAmount.toString())
    ) {
      throw new BadRequestException(
        `Minimum order amount is ${promotion.minOrderAmount.toString()} MMK`,
      );
    }

    const discountValue = parseFloat(promotion.discountValue.toString());
    const discountType = promotion.discountType.typeCode;
    let discountAmount: number;

    if (discountType === 'percentage') {
      discountAmount = Math.floor((subtotal * discountValue) / 100);
    } else {
      discountAmount = Math.min(Math.floor(discountValue), subtotal);
    }

    const finalAmount = Math.max(subtotal - discountAmount, 0);

    return {
      valid: true,
      discountType,
      discountValue: promotion.discountValue.toString(),
      discountAmount: discountAmount.toString(),
      finalAmount: finalAmount.toString(),
    };
  }
}
