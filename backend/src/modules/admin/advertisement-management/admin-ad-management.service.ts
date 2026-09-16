import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { ApprovalStatus, PaymentStatus, Placement, Tier } from './enums';
import {
  AdminAdListQueryDto,
  AdminRejectAdDto,
  AdminBulkApproveDto,
  AdminBulkRejectDto,
  CreateAdFeeSettingDto,
  UpdateAdFeeSettingDto,
  DeactivateAdFeeSettingDto,
  AdminAdFeeHistoryQueryDto,
  RevenueAnalyticsQueryDto,
} from './dto';
import {
  AdminAdApprovalResponseDto,
  AdminAdDetailResponseDto,
  AdminAdFeeHistoryResponseDto,
  AdminAdFeeSettingResponseDto,
  AdminAdvertisementResponseDto,
  AdminBulkOperationResponseDto,
  PaginatedResponseDto,
  RevenueAnalyticsResponseDto,
} from './responses';

const ACTIVE_ADS_CACHE_KEY = 'cache:ads:active';
const PACKAGES_CACHE_KEY = 'cache:ads:packages';

const PLACEMENT_NAMES: Record<string, string> = {
  homepage_banner: 'Homepage Banner',
  product_sidebar: 'Product Sidebar',
  category_banner: 'Category Banner',
  search_top: 'Search Top',
};

const TIER_NAMES: Record<string, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};

type AdRevenueRow = {
  payment_amount: Prisma.Decimal | null;
  placement: string;
  tier: string;
  approved_at: Date;
};

type RefundAggRow = {
  refund_count: number;
  refund_amount: Prisma.Decimal | null;
};

type AdListPayload = Prisma.AdvertisementGetPayload<{
  include: {
    feeSetting: true;
    shop: { select: { id: true; name: true } };
  };
}>;

@Injectable()
export class AdminAdManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Ad Review ──────────────────────────────────────────────────────────

  async listAds(
    query: AdminAdListQueryDto,
  ): Promise<PaginatedResponseDto<AdminAdvertisementResponseDto>> {
    const where: Prisma.AdvertisementWhereInput = {};
    if (query.status) where.approvalStatus = query.status;
    if (query.placement) where.feeSetting = { placement: query.placement };
    if (query.tier) where.feeSetting = { tier: query.tier };
    if (query.shop) {
      where.shop = { name: { contains: query.shop, mode: 'insensitive' } };
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = this.toEndOfDay(query.dateTo);
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.advertisement.findMany({
        where,
        include: {
          feeSetting: true,
          shop: { select: { id: true, name: true } },
        },
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.advertisement.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toAdResponse(item)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async viewAdDetail(id: string): Promise<AdminAdDetailResponseDto> {
    const ad = await this.prisma.advertisement.findUnique({
      where: { id },
      include: {
        feeSetting: true,
        shop: { select: { id: true, name: true } },
        adPayments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!ad) throw new NotFoundException('Advertisement not found');

    const latestPayment = ad.adPayments[0];
    const totalFee = ad.feeSetting
      ? ad.feeSetting.dailyRate.mul(ad.feeSetting.durationDays).toFixed(2)
      : '0.00';

    return {
      ...this.toAdResponse(ad),
      analytics: {
        impressions: 0,
        clicks: 0,
        ctr: 0,
      },
      feeInfo: {
        dailyRate: ad.feeSetting ? ad.feeSetting.dailyRate.toFixed(2) : '0.00',
        durationDays: ad.feeSetting?.durationDays ?? 0,
        totalFee,
      },
      paymentInfo: {
        paymentStatus:
          (latestPayment?.paymentStatus as PaymentStatus) ?? 'pending',
        amount: latestPayment?.amount.toFixed(2) ?? '0.00',
        paidAt: latestPayment?.paidAt?.toISOString() ?? null,
      },
    };
  }

  async approveAd(
    id: string,
    adminId: string,
  ): Promise<AdminAdApprovalResponseDto> {
    const ad = await this.prisma.advertisement.findUnique({
      where: { id },
      include: { shop: { select: { userId: true, name: true } } },
    });
    if (!ad) throw new NotFoundException('Advertisement not found');
    this.assertPending(ad.approvalStatus);

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const result = await tx.advertisement.update({
          where: { id },
          data: {
            approvalStatus: ApprovalStatus.APPROVED,
            approvedBy: adminId,
            approvedAt: new Date(),
          },
        });

        await this.notify(
          {
            userId: ad.shop.userId,
            type: 'AD_APPROVED',
            title: 'Advertisement Approved',
            message: `Your advertisement "${ad.title}" has been approved and is now scheduled.`,
            entityId: ad.id,
          },
          tx,
        );

        await this.logAudit(
          {
            userId: adminId,
            action: 'AD_APPROVED',
            entityType: 'Advertisement',
            entityId: ad.id,
            newValue: {
              shopId: ad.shopId,
              approvalStatus: result.approvalStatus,
            },
          },
          tx,
        );

        return result;
      },
    );

    await this.redis.del(ACTIVE_ADS_CACHE_KEY);

    return {
      id: updated.id,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedBy: updated.approvedBy,
      approvedAt: updated.approvedAt?.toISOString() ?? null,
      rejectionReason: null,
      updatedAt: (updated.approvedAt ?? updated.createdAt).toISOString(),
    };
  }

  async rejectAd(
    id: string,
    dto: AdminRejectAdDto,
    adminId: string,
  ): Promise<AdminAdApprovalResponseDto> {
    const ad = await this.prisma.advertisement.findUnique({
      where: { id },
      include: { shop: { select: { userId: true, name: true } } },
    });
    if (!ad) throw new NotFoundException('Advertisement not found');
    this.assertPending(ad.approvalStatus);

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const completedPayments = await tx.adPayment.findMany({
          where: { adId: id, paymentStatus: PaymentStatus.COMPLETED },
        });
        let totalRefund = 0;
        for (const payment of completedPayments) {
          await tx.adPayment.update({
            where: { id: payment.id },
            data: {
              paymentStatus: PaymentStatus.REFUNDED,
              refundAmount: payment.amount,
              refundReason: dto.rejection_reason,
              refundedAt: new Date(),
            },
          });
          totalRefund += payment.amount.toNumber();
        }

        const result = await tx.advertisement.update({
          where: { id },
          data: {
            approvalStatus: ApprovalStatus.REJECTED,
            approvedBy: adminId,
            approvedAt: new Date(),
            rejectionReason: dto.rejection_reason,
            paymentStatus:
              completedPayments.length > 0
                ? PaymentStatus.REFUNDED
                : ad.paymentStatus,
          },
        });

        await this.notify(
          {
            userId: ad.shop.userId,
            type: 'AD_REJECTED',
            title: 'Advertisement Rejected',
            message: `Your advertisement "${ad.title}" has been rejected. ${dto.rejection_reason}`,
            entityId: ad.id,
          },
          tx,
        );

        await this.logAudit(
          {
            userId: adminId,
            action: 'AD_REJECTED',
            entityType: 'Advertisement',
            entityId: ad.id,
            newValue: {
              shopId: ad.shopId,
              approvalStatus: result.approvalStatus,
              rejectionReason: dto.rejection_reason,
              refundAmount: totalRefund.toFixed(2),
            },
          },
          tx,
        );

        return result;
      },
    );

    await this.redis.del(ACTIVE_ADS_CACHE_KEY);

    return {
      id: updated.id,
      approvalStatus: ApprovalStatus.REJECTED,
      approvedBy: updated.approvedBy,
      approvedAt: updated.approvedAt?.toISOString() ?? null,
      rejectionReason: updated.rejectionReason,
      updatedAt: (updated.approvedAt ?? updated.createdAt).toISOString(),
    };
  }

  async bulkApproveAds(
    dto: AdminBulkApproveDto,
    adminId: string,
  ): Promise<AdminBulkOperationResponseDto> {
    const found = await this.prisma.advertisement.findMany({
      where: { id: { in: dto.ad_ids } },
      select: {
        id: true,
        shopId: true,
        title: true,
        approvalStatus: true,
        shop: { select: { userId: true } },
      },
    });
    this.assertAllPending(
      found.map((ad) => ({ id: ad.id, approvalStatus: ad.approvalStatus })),
      dto.ad_ids,
    );

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.advertisement.updateMany({
        where: { id: { in: dto.ad_ids } },
        data: {
          approvalStatus: ApprovalStatus.APPROVED,
          approvedBy: adminId,
          approvedAt: new Date(),
        },
      });
    });

    let failed = 0;
    for (const ad of found) {
      try {
        await this.notify({
          userId: ad.shop.userId,
          type: 'AD_APPROVED',
          title: 'Advertisement Approved',
          message: `Your advertisement "${ad.title}" has been approved and is now scheduled.`,
          entityId: ad.id,
        });
        await this.logAudit({
          userId: adminId,
          action: 'AD_APPROVED',
          entityType: 'Advertisement',
          entityId: ad.id,
          newValue: { shopId: ad.shopId, approvalStatus: 'approved' },
        });
      } catch (err) {
        failed++;
        console.error('bulkApproveAds post-tx step failed', err);
      }
    }

    await this.logAudit({
      userId: adminId,
      action: 'BULK_AD_APPROVED',
      entityType: 'Advertisement',
      newValue: { adIds: dto.ad_ids, count: dto.ad_ids.length },
    });
    await this.redis.del(ACTIVE_ADS_CACHE_KEY);

    return {
      approved: found.length,
      failed,
      results: found.map((ad) => ({
        id: ad.id,
        approvalStatus: ApprovalStatus.APPROVED,
      })),
    };
  }

  async bulkRejectAds(
    dto: AdminBulkRejectDto,
    adminId: string,
  ): Promise<AdminBulkOperationResponseDto> {
    const found = await this.prisma.advertisement.findMany({
      where: { id: { in: dto.ad_ids } },
      select: {
        id: true,
        shopId: true,
        title: true,
        approvalStatus: true,
        shop: { select: { userId: true } },
      },
    });
    this.assertAllPending(
      found.map((ad) => ({ id: ad.id, approvalStatus: ad.approvalStatus })),
      dto.ad_ids,
    );

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.advertisement.updateMany({
        where: { id: { in: dto.ad_ids } },
        data: {
          approvalStatus: ApprovalStatus.REJECTED,
          approvedBy: adminId,
          approvedAt: new Date(),
          rejectionReason: dto.rejection_reason,
        },
      });
    });

    let failed = 0;
    const results: AdminBulkOperationResponseDto['results'] = [];
    for (const ad of found) {
      const { refundStatus, refundAmount, error } = await this.refundAd(
        ad.id,
        dto.rejection_reason,
      );
      if (error) {
        failed++;
      }
      try {
        await this.notify({
          userId: ad.shop.userId,
          type: 'AD_REJECTED',
          title: 'Advertisement Rejected',
          message: `Your advertisement "${ad.title}" has been rejected. ${dto.rejection_reason}`,
          entityId: ad.id,
        });
        await this.logAudit({
          userId: adminId,
          action: 'AD_REJECTED',
          entityType: 'Advertisement',
          entityId: ad.id,
          newValue: {
            shopId: ad.shopId,
            approvalStatus: 'rejected',
            rejectionReason: dto.rejection_reason,
            refundAmount,
          },
        });
      } catch (err) {
        failed++;
        console.error('bulkRejectAds post-tx step failed', err);
      }
      results.push({
        id: ad.id,
        approvalStatus: ApprovalStatus.REJECTED,
        refundStatus,
      });
    }

    await this.logAudit({
      userId: adminId,
      action: 'BULK_AD_REJECTED',
      entityType: 'Advertisement',
      newValue: { adIds: dto.ad_ids, count: dto.ad_ids.length },
    });
    await this.redis.del(ACTIVE_ADS_CACHE_KEY);

    const refundsProcessed = results.filter(
      (r) => r.refundStatus === 'processed',
    ).length;
    const refundsFailed = results.filter(
      (r) => r.refundStatus === 'failed',
    ).length;

    return {
      rejected: found.length,
      failed,
      refundsProcessed,
      refundsFailed,
      results,
    };
  }

  // ─── Fee Settings ────────────────────────────────────────────────────────

  async listFeeSettings(): Promise<AdminAdFeeSettingResponseDto[]> {
    const settings = await this.prisma.adFeeSetting.findMany({
      orderBy: [{ placement: 'asc' }, { tier: 'asc' }],
    });
    return settings.map((setting) => this.toFeeSettingResponse(setting));
  }

  async createFeeSetting(
    dto: CreateAdFeeSettingDto,
    adminId: string,
  ): Promise<AdminAdFeeSettingResponseDto> {
    const existing = await this.prisma.adFeeSetting.findUnique({
      where: {
        placement_tier: { placement: dto.placement, tier: dto.tier },
      },
    });
    if (existing?.isActive) {
      throw new ConflictException(
        'An active fee setting already exists for this placement and tier',
      );
    }

    const created = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Adaptation: the DB has an unconditional @@unique([placement, tier]),
        // so a duplicate active row is impossible. When an inactive row exists,
        // reuse and reactivate it instead of inserting a conflicting one.
        const setting =
          existing && !existing.isActive
            ? await tx.adFeeSetting.update({
                where: { id: existing.id },
                data: {
                  dailyRate: dto.daily_rate,
                  durationDays: dto.duration_days,
                  maxAds: dto.max_ads,
                  isActive: true,
                },
              })
            : await tx.adFeeSetting.create({
                data: {
                  placement: dto.placement,
                  tier: dto.tier,
                  dailyRate: dto.daily_rate,
                  durationDays: dto.duration_days,
                  maxAds: dto.max_ads,
                  isActive: true,
                },
              });

        await tx.adFeeHistory.create({
          data: {
            adFeeSettingId: setting.id,
            oldDailyRate: existing ? existing.dailyRate : null,
            newDailyRate: setting.dailyRate,
            oldDurationDays: existing ? existing.durationDays : null,
            newDurationDays: setting.durationDays,
            oldMaxAds: existing ? existing.maxAds : null,
            newMaxAds: setting.maxAds,
            changedBy: adminId,
            changeReason: dto.change_reason,
            effectiveFrom: dto.effective_from,
          },
        });

        await this.logAudit(
          {
            userId: adminId,
            action: 'FEE_CREATED',
            entityType: 'AdFeeSetting',
            entityId: setting.id,
            newValue: {
              placement: dto.placement,
              tier: dto.tier,
              dailyRate: dto.daily_rate,
              durationDays: dto.duration_days,
              maxAds: dto.max_ads,
              effectiveFrom: dto.effective_from.toISOString(),
              reactivated: Boolean(existing),
            },
          },
          tx,
        );

        return setting;
      },
    );

    await this.redis.del(PACKAGES_CACHE_KEY);
    return this.toFeeSettingResponse(created);
  }

  async updateFeeSetting(
    id: string,
    dto: UpdateAdFeeSettingDto,
    adminId: string,
  ): Promise<AdminAdFeeSettingResponseDto> {
    const existing = await this.prisma.adFeeSetting.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Fee setting not found');

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const setting = await tx.adFeeSetting.update({
          where: { id },
          data: {
            dailyRate: dto.daily_rate,
            durationDays: dto.duration_days,
            maxAds: dto.max_ads,
          },
        });

        await tx.adFeeHistory.create({
          data: {
            adFeeSettingId: id,
            oldDailyRate: existing.dailyRate,
            newDailyRate: setting.dailyRate,
            oldDurationDays: existing.durationDays,
            newDurationDays: setting.durationDays,
            oldMaxAds: existing.maxAds,
            newMaxAds: setting.maxAds,
            changedBy: adminId,
            changeReason: dto.change_reason,
            effectiveFrom: dto.effective_from,
          },
        });

        await this.logAudit(
          {
            userId: adminId,
            action: 'FEE_UPDATED',
            entityType: 'AdFeeSetting',
            entityId: id,
            oldValue: {
              dailyRate: existing.dailyRate.toFixed(2),
              durationDays: existing.durationDays,
              maxAds: existing.maxAds,
            },
            newValue: {
              dailyRate: setting.dailyRate.toFixed(2),
              durationDays: setting.durationDays,
              maxAds: setting.maxAds,
              effectiveFrom: dto.effective_from.toISOString(),
            },
          },
          tx,
        );

        return setting;
      },
    );

    await this.redis.del(PACKAGES_CACHE_KEY);
    return this.toFeeSettingResponse(updated);
  }

  async deactivateFeeSetting(
    id: string,
    dto: DeactivateAdFeeSettingDto,
    adminId: string,
  ): Promise<AdminAdFeeSettingResponseDto> {
    const existing = await this.prisma.adFeeSetting.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Fee setting not found');
    if (!existing.isActive) {
      throw new ConflictException('Fee setting is already inactive');
    }

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const setting = await tx.adFeeSetting.update({
          where: { id },
          data: { isActive: false },
        });

        // Adaptation: schema requires non-null new_* columns, so on
        // deactivation we snapshot old = current values and new = unchanged
        // values; the change reason explains the deactivation itself.
        await tx.adFeeHistory.create({
          data: {
            adFeeSettingId: id,
            oldDailyRate: existing.dailyRate,
            newDailyRate: setting.dailyRate,
            oldDurationDays: existing.durationDays,
            newDurationDays: setting.durationDays,
            oldMaxAds: existing.maxAds,
            newMaxAds: setting.maxAds,
            changedBy: adminId,
            changeReason: dto.change_reason,
            effectiveFrom: new Date(),
          },
        });

        await this.logAudit(
          {
            userId: adminId,
            action: 'FEE_DEACTIVATED',
            entityType: 'AdFeeSetting',
            entityId: id,
            oldValue: { isActive: true },
            newValue: {
              isActive: false,
              changeReason: dto.change_reason,
            },
          },
          tx,
        );

        return setting;
      },
    );

    await this.redis.del(PACKAGES_CACHE_KEY);
    return this.toFeeSettingResponse(updated);
  }

  async listFeeHistory(
    query: AdminAdFeeHistoryQueryDto,
  ): Promise<PaginatedResponseDto<AdminAdFeeHistoryResponseDto>> {
    const where: Prisma.AdFeeHistoryWhereInput = {};
    if (query.placement) where.setting = { placement: query.placement };
    if (query.tier) where.setting = { tier: query.tier };

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.adFeeHistory.findMany({
        where,
        include: {
          setting: { select: { placement: true, tier: true } },
          changedByAdmin: { select: { id: true, name: true } },
        },
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adFeeHistory.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        id: item.id,
        placement: item.setting.placement as Placement,
        tier: item.setting.tier as Tier,
        oldDailyRate: item.oldDailyRate?.toFixed(2) ?? null,
        newDailyRate: item.newDailyRate.toFixed(2),
        oldDurationDays: item.oldDurationDays,
        newDurationDays: item.newDurationDays,
        oldMaxAds: item.oldMaxAds,
        newMaxAds: item.newMaxAds,
        changedBy: item.changedBy,
        changedByName: item.changedByAdmin?.name ?? '',
        changeReason: item.changeReason,
        effectiveFrom: item.effectiveFrom.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  // ─── Analytics ───────────────────────────────────────────────────────────

  async getRevenueAnalytics(
    query: RevenueAnalyticsQueryDto,
  ): Promise<RevenueAnalyticsResponseDto> {
    const start = new Date(query.dateFrom);
    const end = new Date(query.dateTo);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (end < start) {
      throw new BadRequestException('dateTo must be on or after dateFrom');
    }
    const days = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days > 365) {
      throw new BadRequestException('Date range must not exceed 365 days');
    }

    const conditions: Prisma.Sql[] = [
      Prisma.sql`ad.approval_status = 'approved'`,
      Prisma.sql`ad.approved_at >= ${start}`,
      Prisma.sql`ad.approved_at <= ${this.toEndOfDay(query.dateTo)}`,
    ];
    if (query.placement?.length) {
      conditions.push(
        Prisma.sql`f.placement IN (${Prisma.join(query.placement)})`,
      );
    }
    if (query.tier?.length) {
      conditions.push(Prisma.sql`f.tier IN (${Prisma.join(query.tier)})`);
    }

    const rows = await this.prisma.$queryRaw<AdRevenueRow[]>`
      SELECT ad.payment_amount, f.placement, f.tier, ad.approved_at
      FROM advertisements ad
      JOIN ad_fee_settings f ON f.id = ad.fee_setting_id
      WHERE ${Prisma.join(conditions, ' AND ')}
    `;

    const refunds = await this.prisma.$queryRaw<RefundAggRow[]>`
      SELECT
        COUNT(*)::int AS refund_count,
        COALESCE(SUM(refund_amount), 0) AS refund_amount
      FROM ad_payments
      WHERE payment_status = 'refunded'
        AND refunded_at >= ${start}
        AND refunded_at <= ${this.toEndOfDay(query.dateTo)}
    `;
    const refundAgg = refunds[0];

    const totalRevenue = round2(
      rows.reduce((sum, row) => sum + Number(row.payment_amount ?? 0), 0),
    );
    const totalAdsApproved = rows.length;
    const totalRefunds = refundAgg?.refund_count ?? 0;
    const refundAmount = Number(refundAgg?.refund_amount ?? 0);
    const totalFeesCollected = round2(totalRevenue - refundAmount);
    const avgRevenuePerAd =
      totalAdsApproved > 0 ? round2(totalRevenue / totalAdsApproved) : 0;

    const placementMap = new Map<
      string,
      { adCount: number; revenue: number }
    >();
    const tierMap = new Map<string, { adCount: number; revenue: number }>();
    const trendMap = new Map<
      string,
      { date: string; revenue: number; adCount: number }
    >();
    for (const row of rows) {
      const amount = Number(row.payment_amount ?? 0);
      const placementAgg = placementMap.get(row.placement) ?? {
        adCount: 0,
        revenue: 0,
      };
      placementAgg.adCount += 1;
      placementAgg.revenue += amount;
      placementMap.set(row.placement, placementAgg);

      const tierAgg = tierMap.get(row.tier) ?? { adCount: 0, revenue: 0 };
      tierAgg.adCount += 1;
      tierAgg.revenue += amount;
      tierMap.set(row.tier, tierAgg);

      const date = row.approved_at.toISOString().slice(0, 10);
      const trendAgg = trendMap.get(date) ?? {
        date,
        revenue: 0,
        adCount: 0,
      };
      trendAgg.revenue += amount;
      trendAgg.adCount += 1;
      trendMap.set(date, trendAgg);
    }

    return {
      summary: {
        totalRevenue,
        totalAdsApproved,
        totalFeesCollected,
        avgRevenuePerAd,
        totalRefunds,
      },
      byPlacement: [...placementMap.entries()]
        .map(([placement, agg]) => ({
          placement: placement as Placement,
          placementName: PLACEMENT_NAMES[placement] ?? placement,
          adCount: agg.adCount,
          revenue: round2(agg.revenue),
          avgCtr: 0,
        }))
        .sort((a, b) => b.adCount - a.adCount),
      byTier: [...tierMap.entries()]
        .map(([tier, agg]) => ({
          tier: tier as Tier,
          tierName: TIER_NAMES[tier] ?? tier,
          adCount: agg.adCount,
          revenue: round2(agg.revenue),
          avgCtr: 0,
        }))
        .sort((a, b) => b.adCount - a.adCount),
      trend: [...trendMap.values()].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────

  private assertPending(approvalStatus: string) {
    if (approvalStatus !== 'pending') {
      throw new BadRequestException(
        'Only pending advertisements can be processed',
      );
    }
  }

  private assertAllPending(
    foundAds: Array<{ id: string; approvalStatus: string }>,
    requestedIds: string[],
  ) {
    const foundIds = new Set(foundAds.map((ad) => ad.id));
    const invalidIds = [
      ...requestedIds.filter((id) => !foundIds.has(id)),
      ...foundAds
        .filter((ad) => ad.approvalStatus !== 'pending')
        .map((ad) => ad.id),
    ];
    if (invalidIds.length === 0) return;
    const unique = [...new Set(invalidIds)];
    throw new BadRequestException(
      `Only pending advertisements can be processed. Invalid IDs: ${unique.join(', ')}`,
    );
  }

  private async refundAd(
    adId: string,
    reason: string,
  ): Promise<{
    refundStatus: 'processed' | 'failed';
    refundAmount: string;
    error?: string;
  }> {
    try {
      const completedPayment = await this.prisma.adPayment.findFirst({
        where: { adId, paymentStatus: PaymentStatus.COMPLETED },
        orderBy: { createdAt: 'desc' },
      });
      if (completedPayment) {
        await this.prisma.adPayment.update({
          where: { id: completedPayment.id },
          data: {
            paymentStatus: PaymentStatus.REFUNDED,
            refundAmount: completedPayment.amount,
            refundReason: reason,
            refundedAt: new Date(),
          },
        });
        await this.prisma.advertisement.update({
          where: { id: adId },
          data: { paymentStatus: PaymentStatus.REFUNDED },
        });
      }
      return {
        refundStatus: 'processed',
        refundAmount: completedPayment?.amount.toFixed(2) ?? '0.00',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`refundAd failed for ad ${adId}`, err);
      return { refundStatus: 'failed', refundAmount: '0.00', error: message };
    }
  }

  private async notify(
    data: {
      userId: string;
      type: string;
      title: string;
      message: string;
      entityId: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    await client.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        entityType: 'Advertisement',
        entityId: data.entityId,
      },
    });
  }

  private async logAudit(
    data: {
      userId: string;
      action: string;
      entityType: string;
      entityId?: string;
      oldValue?: Record<string, unknown>;
      newValue?: Record<string, unknown>;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValue: data.oldValue
          ? (JSON.parse(JSON.stringify(data.oldValue)) as Prisma.InputJsonValue)
          : undefined,
        newValue: data.newValue
          ? (JSON.parse(JSON.stringify(data.newValue)) as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  private toEndOfDay(value: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T23:59:59.999Z`);
    }
    return new Date(value);
  }

  private toAdResponse(ad: AdListPayload): AdminAdvertisementResponseDto {
    return {
      id: ad.id,
      shopId: ad.shopId,
      shopName: ad.shop.name,
      title: ad.title,
      announcementMessage: ad.announcementMessage,
      content: ad.content,
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl,
      placement: (ad.feeSetting?.placement ?? null) as Placement | null,
      tier: (ad.feeSetting?.tier ?? null) as Tier | null,
      isActive: ad.isActive,
      approvalStatus: ad.approvalStatus as ApprovalStatus,
      paymentStatus: ad.paymentStatus as PaymentStatus,
      paymentAmount: ad.paymentAmount?.toFixed(2) ?? null,
      approvedBy: ad.approvedBy,
      approvedAt: ad.approvedAt?.toISOString() ?? null,
      rejectionReason: ad.rejectionReason,
      startsAt: ad.startsAt?.toISOString() ?? null,
      expiresAt: ad.expiresAt?.toISOString() ?? null,
      weekNumber: ad.weekNumber,
      createdAt: ad.createdAt.toISOString(),
    };
  }

  private toFeeSettingResponse(setting: {
    id: string;
    placement: string;
    tier: string;
    dailyRate: Prisma.Decimal;
    durationDays: number;
    maxAds: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): AdminAdFeeSettingResponseDto {
    return {
      id: setting.id,
      placement: setting.placement as Placement,
      tier: setting.tier as Tier,
      dailyRate: setting.dailyRate.toFixed(2),
      durationDays: setting.durationDays,
      maxAds: setting.maxAds,
      isActive: setting.isActive,
      totalFee: setting.dailyRate.mul(setting.durationDays).toFixed(2),
      createdAt: setting.createdAt.toISOString(),
      updatedAt: setting.updatedAt.toISOString(),
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
