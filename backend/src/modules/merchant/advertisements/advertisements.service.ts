import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
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

@Injectable()
export class AdvertisementsService {
  private readonly logger = new Logger(AdvertisementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async listPackages() {
    const cached = await this.redis.get(PACKAGES_CACHE_KEY);
    if (cached) return JSON.parse(cached) as unknown;

    const settings = await this.prisma.adFeeSetting.findMany({
      where: {
        isActive: true,
        history: {
          some: { effectiveFrom: { lte: new Date() } },
        },
      },
      include: {
        history: {
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
      },
      // Most recently updated packages first, so a package an admin just
      // created, re-rated or reactivated shows up as the first card of the
      // merchant catalog. Placement → tier is kept as a deterministic
      // tie-breaker for packages written in the same transaction.
      orderBy: [{ updatedAt: 'desc' }, { placement: 'asc' }, { tier: 'asc' }],
    });
    // Hide packages whose latest effective_from date has not been reached yet.
    const visibleSettings = settings.filter(
      (setting) =>
        setting.history[0] && setting.history[0].effectiveFrom <= new Date(),
    );
    const result = visibleSettings.map((setting) => ({
      id: setting.id,
      placement: setting.placement,
      tier: setting.tier,
      dailyRate: setting.dailyRate.toFixed(2),
      durationDays: setting.durationDays,
      maxAds: setting.maxAds,
      totalFee: setting.dailyRate.mul(setting.durationDays).toFixed(2),
      updatedAt: setting.updatedAt.toISOString(),
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
      where: {
        id: feeSettingId,
        isActive: true,
        history: { some: { effectiveFrom: { lte: new Date() } } },
      },
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
      include: { feeSetting: true, shop: true },
    });
    await this.audit(userId, 'AD_SELECTED', ad.id, {
      shopId: shop.id,
      feeSettingId: setting.id,
      placement: setting.placement,
      tier: setting.tier,
    });
    return this.toResponse(ad);
  }

  async uploadContent(id: string, dto: UploadAdContentDto, userId: string) {
    const ad = await this.getOwnedAd(id, userId);
    if (!ad.feeSetting)
      throw new ConflictException('Advertisement package is unavailable');
    if (ad.paymentStatus !== 'pending' || ad.approvalStatus !== 'pending') {
      throw new BadRequestException('Advertisement cannot accept content');
    }
    const imageUrl = await this.resolveProductImage(dto.imageUrl, userId);
    const schedule = this.getSchedule(dto.startsAt, ad.feeSetting.durationDays);
    const updated = await this.prisma.advertisement.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content || null,
        imageUrl,
        announcementMessage: dto.announcementMessage,
        startsAt: schedule.startsAt,
        expiresAt: schedule.expiresAt,
      },
      include: { feeSetting: true, shop: true },
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
        include: { feeSetting: true, shop: true },
      });
    });
    await this.redis.del(ACTIVE_ADS_CACHE_KEY);
    await this.audit(userId, 'AD_PAID', id, {
      shopId: ad.shopId,
      amount: amount.toFixed(2),
      reference: dto.paymentReference || null,
    });
    await this.notifyAdminsOfNewSubmission(
      result,
      ad.approvalStatus === 'rejected',
    );
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
      // "Inactive" shows every ad that is not currently on air and not gone:
      // pending submissions (draft / content uploaded / pending approval),
      // approved+paid ads that have not reached their start date yet, and
      // merchant-toggled-off approved ads. Soft-deleted ads (isActive=false
      // while not approved) and expired ads stay excluded.
      where.OR = [
        { approvalStatus: 'pending' },
        {
          approvalStatus: 'approved',
          paymentStatus: 'completed',
          startsAt: { gt: now },
        },
        { isActive: false, approvalStatus: 'approved' },
      ];
      where.AND = [{ OR: [{ expiresAt: { gte: now } }, { expiresAt: null }] }];
      where.NOT = { isActive: false, approvalStatus: { not: 'approved' } };
    } else if (query.status === 'expired') {
      where.expiresAt = { lt: now };
      where.NOT = { isActive: false, approvalStatus: { not: 'approved' } };
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
        include: { feeSetting: true, shop: true },
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

  async updateContent(id: string, dto: UpdateAdContentDto, userId: string) {
    const ad = await this.getOwnedAd(id, userId);
    if (!ad.feeSetting)
      throw new ConflictException('Advertisement package is unavailable');
    if (
      ad.approvalStatus !== 'rejected' &&
      (ad.approvalStatus !== 'pending' || ad.paymentStatus !== 'pending')
    ) {
      throw new BadRequestException('Advertisement cannot be edited');
    }
    // Omitting imageUrl keeps the currently saved image; when present it must
    // still be one of the merchant's own product images.
    const imageUrl = dto.imageUrl
      ? await this.resolveProductImage(dto.imageUrl, userId)
      : undefined;
    // A rejected ad being resubmitted may re-pick its start date (its
    // original window may already have started or passed). expires_at is
    // derived from the package duration; the 3-day lead time applies, same
    // as new uploads.
    const schedule = dto.startsAt
      ? this.getSchedule(dto.startsAt, ad.feeSetting.durationDays)
      : null;
    const updated = await this.prisma.advertisement.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content || null,
        imageUrl,
        announcementMessage: dto.announcementMessage,
        ...(schedule
          ? { startsAt: schedule.startsAt, expiresAt: schedule.expiresAt }
          : {}),
      },
      include: { feeSetting: true, shop: true },
    });
    await this.redis.del(ACTIVE_ADS_CACHE_KEY);
    await this.audit(userId, 'AD_UPDATED', id, { shopId: ad.shopId });
    return this.toResponse(updated);
  }

  async deleteAd(id: string, userId: string) {
    const ad = await this.getOwnedAd(id, userId);
    const isExpired = Boolean(
      ad.expiresAt && new Date(ad.expiresAt) < new Date(),
    );
    if (ad.approvalStatus === 'approved' && ad.isActive && !isExpired) {
      throw new BadRequestException(
        'Active approved advertisements cannot be deleted',
      );
    }
    if (isExpired || ad.paymentStatus === 'pending') {
      // Draft ads (and unpaid rejected drafts) that were never paid hold no
      // campaign or payment history, so they are removed permanently.
      // Expired advertisements no longer run a live campaign, so they too are
      // removed permanently instead of being soft-deleted.
      await this.prisma.advertisement.delete({ where: { id } });
    } else {
      await this.prisma.advertisement.update({
        where: { id },
        data: { isActive: false },
      });
    }
    await this.redis.del(ACTIVE_ADS_CACHE_KEY);
    await this.audit(userId, 'AD_DELETED', id, { shopId: ad.shopId });
    return { message: 'Advertisement deleted' };
  }

  async toggleActive(id: string, dto: ToggleAdActiveDto, userId: string) {
    // Toggle only needs ownership + approved/paid checks; the package
    // (feeSetting) is optional here — ads whose package was deactivated by an
    // admin must still be toggleable (design rule swtToggleActive only
    // requires approval_status = 'approved' AND payment_status = 'completed').
    const shop = await this.getShop(userId);
    const ad = await this.prisma.advertisement.findUnique({
      where: { id },
      include: { feeSetting: true, shop: true },
    });
    if (!ad) throw new NotFoundException('Advertisement not found');
    if (ad.shopId !== shop.id)
      throw new ForbiddenException(
        'You do not have permission to manage this advertisement',
      );
    if (ad.approvalStatus !== 'approved' || ad.paymentStatus !== 'completed') {
      throw new BadRequestException(
        'Only approved and paid advertisements can be toggled',
      );
    }
    const updated = await this.prisma.advertisement.update({
      where: { id },
      data: { isActive: dto.isActive },
      include: { feeSetting: true, shop: true },
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

  private getSchedule(
    startsAtValue: string,
    durationDays: number,
    minDaysFromToday = 3,
  ) {
    const startsAt = new Date(startsAtValue);
    // Earliest selectable start date is today + 3 days (UTC day granularity):
    // today, tomorrow, and the day after tomorrow are not allowed. Applies to
    // both new uploads and resubmission of rejected ads.
    const minDate = new Date();
    minDate.setUTCHours(0, 0, 0, 0);
    minDate.setUTCDate(minDate.getUTCDate() + minDaysFromToday);
    if (Number.isNaN(startsAt.getTime()) || startsAt < minDate) {
      throw new BadRequestException(
        'Start date must be at least 3 days from today',
      );
    }
    const expiresAt = new Date(startsAt);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + durationDays);
    if (expiresAt <= startsAt)
      throw new ConflictException('AD_SCHEDULE_INVALID');
    return { startsAt, expiresAt };
  }

  // Advertisement images are never uploaded: the merchant picks one of the
  // images already attached to one of their own products. The value is
  // therefore a stored upload path, and ownership is verified against the
  // merchant's catalogue before it is persisted.
  private async resolveProductImage(imageUrl: string, userId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!merchant) throw new NotFoundException('Merchant profile not found');
    const product = await this.prisma.product.findFirst({
      where: { merchantId: merchant.id, images: { has: imageUrl } },
      select: { id: true },
    });
    if (!product) {
      throw new BadRequestException(
        'Advertisement image must be selected from your products',
      );
    }
    return imageUrl;
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
    ad: Prisma.AdvertisementGetPayload<{
      include: { feeSetting: true; shop: true };
    }>,
  ) {
    return {
      id: ad.id,
      shopId: ad.shopId,
      shopName: ad.shop.name,
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

  // Fans out an AD_SUBMITTED notification to every admin so a paid ad landing
  // in the review queue is visible without polling /admin/ads. The reverse
  // direction (AD_APPROVED / AD_REJECTED back to the shop owner) is handled by
  // AdminAdManagementService. This is the only place a submission enters the
  // review queue, so it also covers resubmission of a rejected ad — admins are
  // notified again each time the merchant re-pays, with a distinct title and
  // message for resubmissions. Notification writes are best-effort: a failure
  // here must never roll back a completed payment.
  private async notifyAdminsOfNewSubmission(
    ad: Prisma.AdvertisementGetPayload<{ include: { feeSetting: true } }>,
    isResubmission: boolean,
  ) {
    try {
      const [admins, shop] = await Promise.all([
        this.prisma.user.findMany({
          where: { roleCode: { in: ['admin', 'super_admin'] } },
          select: { id: true },
        }),
        this.prisma.shop.findUnique({
          where: { id: ad.shopId },
          select: { name: true },
        }),
      ]);
      if (admins.length === 0) return;
      const shopName = shop?.name ?? 'A shop';
      const title = isResubmission
        ? 'Advertisement resubmitted'
        : 'New advertisement submitted';
      const message = isResubmission
        ? `${shopName} resubmitted advertisement "${ad.title || 'Untitled advertisement'}" and it is pending approval.`
        : `${shopName} submitted "${ad.title || 'Untitled advertisement'}" and it is pending approval.`;
      await this.prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: 'AD_SUBMITTED',
          title,
          message,
          entityType: 'Advertisement',
          entityId: ad.id,
        })),
        skipDuplicates: true,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to notify admins of advertisement submission ${ad.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
