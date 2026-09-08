import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { AdListQueryDto } from './dto/ad-list-query.dto';
import { PayAdFeeDto } from './dto/pay-ad-fee.dto';
import { ToggleAdActiveDto } from './dto/toggle-ad-active.dto';
import { UpdateAdContentDto } from './dto/update-ad-content.dto';
import { UploadAdContentDto } from './dto/upload-ad-content.dto';

const ACTIVE_ADS_CACHE_KEY = 'cache:ads:active';
const PACKAGES_CACHE_KEY = 'cache:ads:packages';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class AdvertisementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async listPackages() {
    const cached = await this.redis.get(PACKAGES_CACHE_KEY);
    if (cached) return JSON.parse(cached) as unknown;

    const settings = await this.prisma.adFeeSetting.findMany({
      where: { isActive: true },
      orderBy: [{ placement: 'asc' }, { tier: 'asc' }],
    });
    const result = settings.map((setting) => ({
      id: setting.id,
      placement: setting.placement,
      tier: setting.tier,
      dailyRate: setting.dailyRate.toFixed(2),
      durationDays: setting.durationDays,
      maxAds: setting.maxAds,
      totalFee: setting.dailyRate.mul(setting.durationDays).toFixed(2),
    }));
    await this.redis.set(PACKAGES_CACHE_KEY, JSON.stringify(result), 600);
    return result;
  }

  async selectPackage(feeSettingId: string, userId: string) {
    const shop = await this.getShop(userId);
    if (!shop.isApproved) {
      throw new ForbiddenException('SHOP_NOT_APPROVED');
    }

    const setting = await this.prisma.adFeeSetting.findFirst({
      where: { id: feeSettingId, isActive: true },
    });
    if (!setting) throw new NotFoundException('AD_PACKAGE_INVALID');

    const ad = await this.prisma.advertisement.create({
      data: {
        shopId: shop.id,
        feeSettingId: setting.id,
        title: '',
        announcementMessage: '',
        approvalStatus: 'pending',
        paymentStatus: 'pending',
        isActive: true,
        startsAt: null,
        expiresAt: null,
        weekNumber: null,
      },
      include: { feeSetting: true },
    });
    await this.audit(userId, 'AD_SELECTED', ad.id, {
      shopId: shop.id,
      feeSettingId: setting.id,
      placement: setting.placement,
      tier: setting.tier,
    });
    return this.toResponse(ad);
  }

  async uploadContent(
    id: string,
    dto: UploadAdContentDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ) {
    const ad = await this.getOwnedAd(id, userId);
    if (!ad.feeSetting)
      throw new ConflictException('Advertisement package is unavailable');
    if (ad.paymentStatus !== 'pending' || ad.approvalStatus !== 'pending') {
      throw new BadRequestException('Advertisement cannot accept content');
    }
    const imageUrl = file ? await this.saveImage(file) : ad.imageUrl;
    const schedule = this.getSchedule(dto.startsAt, ad.feeSetting.durationDays);
    const updated = await this.prisma.advertisement.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content || null,
        imageUrl,
        linkUrl: dto.linkUrl || null,
        announcementMessage: dto.announcementMessage,
        startsAt: schedule.startsAt,
        expiresAt: schedule.expiresAt,
      },
      include: { feeSetting: true },
    });
    await this.redis.del(ACTIVE_ADS_CACHE_KEY);
    await this.audit(userId, 'AD_CONTENT_UPLOADED', id, {
      shopId: ad.shopId,
      title: dto.title,
      hasImage: Boolean(imageUrl),
    });
    return this.toResponse(updated);
  }

  async payFee(id: string, dto: PayAdFeeDto, userId: string) {
    const ad = await this.getOwnedAd(id, userId);
    if (!ad.feeSetting)
      throw new ConflictException('Advertisement package is unavailable');
    if (
      !['pending', 'rejected'].includes(ad.approvalStatus) ||
      !['pending', 'refunded'].includes(ad.paymentStatus) ||
      !ad.title ||
      !ad.announcementMessage ||
      !ad.startsAt ||
      !ad.expiresAt
    ) {
      throw new BadRequestException(
        'Advertisement content and schedule are required',
      );
    }

    const amount = ad.feeSetting.dailyRate.mul(ad.feeSetting.durationDays);
    const transactionId = `TXN-${randomUUID()}`;
    const weekNumber = this.getIsoWeek(ad.startsAt);
    const result = await this.prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.findUnique({ where: { userId } });
      if (!merchant) throw new NotFoundException('Merchant profile not found');
      await tx.adPayment.create({
        data: {
          adId: id,
          merchantId: merchant.id,
          amount,
          paymentMethod: 'stubbed',
          paymentStatus: 'completed',
          transactionId,
          paidAt: new Date(),
        },
      });
      return tx.advertisement.update({
        where: { id },
        data: {
          paymentStatus: 'completed',
          approvalStatus: 'pending',
          paymentAmount: amount,
          paymentReference: dto.paymentReference || null,
          weekNumber,
        },
        include: { feeSetting: true },
      });
    });
    await this.redis.del(ACTIVE_ADS_CACHE_KEY);
    await this.audit(userId, 'AD_PAID', id, {
      shopId: ad.shopId,
      amount: amount.toFixed(2),
      reference: dto.paymentReference || null,
    });
    return this.toResponse(result);
  }

  async listOwnAds(query: AdListQueryDto, userId: string) {
    const shop = await this.getShop(userId);
    const now = new Date();
    const where: Prisma.AdvertisementWhereInput = { shopId: shop.id };
    if (query.approvalStatus) where.approvalStatus = query.approvalStatus;
    if (query.search)
      where.title = { contains: query.search, mode: 'insensitive' };
    if (query.status === 'active') {
      Object.assign(where, {
        isActive: true,
        approvalStatus: 'approved',
        paymentStatus: 'completed',
        startsAt: { lte: now },
        expiresAt: { gte: now },
      });
    } else if (query.status === 'inactive') {
      where.isActive = false;
    } else if (query.status === 'expired') {
      where.expiresAt = { lt: now };
    } else {
      // Default "All statuses" view hides soft-deleted advertisements.
      // deleteAd sets isActive = false for non-approved ads, while only
      // approved ads can be toggled inactive by merchants — so approved +
      // inactive ads stay visible as the merchant-controlled INACTIVE state.
      where.OR = [{ isActive: true }, { approvalStatus: 'approved' }];
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.advertisement.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { feeSetting: true },
      }),
      this.prisma.advertisement.count({ where }),
    ]);
    return {
      data: items.map((item) => this.toResponse(item)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async updateContent(
    id: string,
    dto: UpdateAdContentDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ) {
    const ad = await this.getOwnedAd(id, userId);
    if (
      ad.approvalStatus !== 'rejected' &&
      (ad.approvalStatus !== 'pending' || ad.paymentStatus !== 'pending')
    ) {
      throw new BadRequestException('Advertisement cannot be edited');
    }
    const updated = await this.prisma.advertisement.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content || null,
        imageUrl: file ? await this.saveImage(file) : undefined,
        linkUrl: dto.linkUrl || null,
        announcementMessage: dto.announcementMessage,
      },
      include: { feeSetting: true },
    });
    await this.redis.del(ACTIVE_ADS_CACHE_KEY);
    await this.audit(userId, 'AD_UPDATED', id, { shopId: ad.shopId });
    return this.toResponse(updated);
  }

  async deleteAd(id: string, userId: string) {
    const ad = await this.getOwnedAd(id, userId);
    if (ad.approvalStatus === 'approved' && ad.isActive) {
      throw new BadRequestException(
        'Active approved advertisements cannot be deleted',
      );
    }
    await this.prisma.advertisement.update({
      where: { id },
      data: { isActive: false },
    });
    await this.redis.del(ACTIVE_ADS_CACHE_KEY);
    await this.audit(userId, 'AD_DELETED', id, { shopId: ad.shopId });
    return { message: 'Advertisement deleted' };
  }

  async toggleActive(id: string, dto: ToggleAdActiveDto, userId: string) {
    const ad = await this.getOwnedAd(id, userId);
    if (ad.approvalStatus !== 'approved' || ad.paymentStatus !== 'completed') {
      throw new BadRequestException(
        'Only approved and paid advertisements can be toggled',
      );
    }
    const updated = await this.prisma.advertisement.update({
      where: { id },
      data: { isActive: dto.isActive },
      include: { feeSetting: true },
    });
    await this.redis.del(ACTIVE_ADS_CACHE_KEY);
    await this.audit(userId, 'AD_TOGGLED', id, {
      shopId: ad.shopId,
      isActive: dto.isActive,
    });
    return this.toResponse(updated);
  }

  async listActiveAds() {
    const cached = await this.redis.get(ACTIVE_ADS_CACHE_KEY);
    if (cached) return JSON.parse(cached) as unknown;
    const ads = await this.prisma.advertisement.findMany({
      where: {
        isActive: true,
        approvalStatus: 'approved',
        paymentStatus: 'completed',
        startsAt: { lte: new Date() },
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: { feeSetting: true },
    });
    const result = ads.map((ad) => this.toActiveResponse(ad));
    await this.redis.set(ACTIVE_ADS_CACHE_KEY, JSON.stringify(result), 300);
    return result;
  }

  private async getShop(userId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { userId } });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  private async getOwnedAd(id: string, userId: string) {
    const shop = await this.getShop(userId);
    const ad = await this.prisma.advertisement.findUnique({
      where: { id },
      include: { feeSetting: true },
    });
    if (!ad) throw new NotFoundException('Advertisement not found');
    if (ad.shopId !== shop.id)
      throw new ForbiddenException(
        'You do not have permission to manage this advertisement',
      );
    if (!ad.feeSetting)
      throw new ConflictException('Advertisement package is unavailable');
    return ad;
  }

  private getSchedule(startsAtValue: string, durationDays: number) {
    const startsAt = new Date(startsAtValue);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (Number.isNaN(startsAt.getTime()) || startsAt < today) {
      throw new BadRequestException('Start date must be today or later');
    }
    const expiresAt = new Date(startsAt);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + durationDays);
    if (expiresAt <= startsAt)
      throw new ConflictException('AD_SCHEDULE_INVALID');
    return { startsAt, expiresAt };
  }

  private async saveImage(file: Express.Multer.File) {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype))
      throw new UnsupportedMediaTypeException(
        'Image must be JPG, PNG, or WebP',
      );
    if (file.size > MAX_IMAGE_SIZE)
      throw new PayloadTooLargeException('Image file must not exceed 5MB');
    const extension = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const directory = process.env.AD_IMAGE_STORAGE_PATH || './uploads/ads';
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(join(directory, filename), file.buffer);
    return `/uploads/ads/${filename}`;
  }

  private getIsoWeek(date: Date) {
    const utcDate = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const day = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    return Math.ceil(
      ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
  }

  private toResponse(
    ad: Prisma.AdvertisementGetPayload<{ include: { feeSetting: true } }>,
  ) {
    return {
      id: ad.id,
      shopId: ad.shopId,
      title: ad.title,
      content: ad.content,
      announcementMessage: ad.announcementMessage,
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl,
      isActive: ad.isActive,
      approvalStatus: ad.approvalStatus,
      paymentStatus: ad.paymentStatus,
      paymentAmount: ad.paymentAmount?.toFixed(2) ?? null,
      paymentReference: ad.paymentReference,
      approvedBy: ad.approvedBy,
      approvedAt: ad.approvedAt?.toISOString() ?? null,
      rejectionReason: ad.rejectionReason,
      weekNumber: ad.weekNumber,
      startsAt: ad.startsAt?.toISOString() ?? null,
      expiresAt: ad.expiresAt?.toISOString() ?? null,
      createdAt: ad.createdAt.toISOString(),
      package: ad.feeSetting
        ? {
            placement: ad.feeSetting.placement,
            tier: ad.feeSetting.tier,
            dailyRate: ad.feeSetting.dailyRate.toFixed(2),
            durationDays: ad.feeSetting.durationDays,
          }
        : null,
    };
  }

  private toActiveResponse(
    ad: Prisma.AdvertisementGetPayload<{ include: { feeSetting: true } }>,
  ) {
    return {
      id: ad.id,
      shopId: ad.shopId,
      title: ad.title,
      content: ad.content,
      announcementMessage: ad.announcementMessage,
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl,
      startsAt: ad.startsAt?.toISOString(),
      expiresAt: ad.expiresAt?.toISOString(),
      tier: ad.feeSetting?.tier,
    };
  }

  private async audit(
    userId: string,
    action: string,
    entityId: string,
    value: object,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: 'Advertisement',
        entityId,
        newValue: JSON.stringify(value),
      },
    });
  }
}
