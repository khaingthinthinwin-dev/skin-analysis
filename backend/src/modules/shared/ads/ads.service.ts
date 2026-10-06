import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import type { Advertisement } from '@prisma/client';

const ROTATION_TTL = 24 * 60 * 60; // 24 hours
const MAX_ADS_PER_PANEL = 5;

type AdvertisementWithShop = Advertisement & {
  shop: { id: string; name: string; userId: string };
  feeSetting?: { placement: string; tier: string; isActive: boolean } | null;
};

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getAdsByPlacement(placement: string, sessionId?: string) {
    const now = new Date();
    // DD_MATCH_05 §6.1 (BR-MATCH-037) + DD_MATCH_03 §2.4:
    // placement condition comes from feeSetting.placement,
    // date condition is startsAt <= now < expiresAt.
    const isBannerPlacement =
      typeof placement === 'string' && placement.endsWith('_banner');

    try {
      // Get all eligible ads sorted by payment amount (desc) then createdAt (desc)
      const ads = await this.prisma.advertisement.findMany({
        where: {
          isActive: true,
          approvalStatus: 'approved',
          paymentStatus: 'completed',
          startsAt: { lte: now },
          expiresAt: { gt: now },
          ...(isBannerPlacement
            ? { feeSetting: { placement, isActive: true } }
            : {}),
        },
        include: {
          feeSetting: {
            select: { placement: true, tier: true, isActive: true },
          },
          shop: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
        },
        orderBy: [{ paymentAmount: 'desc' }, { createdAt: 'desc' }],
      });

      if (ads.length === 0) {
        return {
          data: [],
          placement,
          meta: { total: 0, maxAds: MAX_ADS_PER_PANEL },
        };
      }

      // Apply round-robin rotation if sessionId provided
      let selectedAds: AdvertisementWithShop[];
      if (sessionId && this.redis.isAvailable()) {
        selectedAds = await this.rotateAds(ads, sessionId, placement);
      } else {
        // No rotation - just take first 5
        selectedAds = ads.slice(0, MAX_ADS_PER_PANEL);
      }

      // The ad's sku is stamped from the merchant's product when the ad image
      // is picked, so match on sku first and fall back to the image file.
      const merchants = await this.prisma.merchant.findMany({
        where: {
          userId: {
            in: [...new Set(selectedAds.map((ad) => ad.shop.userId))],
          },
        },
        select: { id: true },
      });
      const catalogue = merchants.length
        ? await this.prisma.product.findMany({
            where: { merchantId: { in: merchants.map((m) => m.id) } },
            select: { id: true, slug: true, images: true, sku: true },
          })
        : [];

      const imageFileName = (url: string | null): string => {
        if (!url) return '';
        const path = url.split('?')[0];
        return path.slice(path.lastIndexOf('/') + 1);
      };

      const resolveTarget = (ad: AdvertisementWithShop) => {
        const bySku = ad.sku
          ? catalogue.find((p) => p.sku !== null && p.sku === ad.sku)
          : undefined;
        if (bySku) return { productId: bySku.id, productSlug: bySku.slug };

        const fileName = imageFileName(ad.imageUrl);
        const match = fileName
          ? catalogue.find((p) =>
              p.images.some((img) => imageFileName(img) === fileName),
            )
          : undefined;
        if (match) return { productId: match.id, productSlug: match.slug };

        return { productId: null, productSlug: null };
      };

      return {
        data: selectedAds.map((ad) => ({
          adId: ad.id,
          title: ad.title,
          description: ad.content,
          announcementMessage: ad.announcementMessage,
          imageUrl: ad.imageUrl || '',
          sku: ad.sku || null,
          ctaText: ad.announcementMessage || 'Shop Now',
          priorityAmount: ad.paymentAmount?.toString() || null,
          shopName: ad.shop.name,
          placement: ad.feeSetting?.placement ?? null,
          startsAt: ad.startsAt ? ad.startsAt.toISOString() : null,
          expiresAt: ad.expiresAt ? ad.expiresAt.toISOString() : null,
          ...resolveTarget(ad),
        })),
        placement,
        meta: {
          total: selectedAds.length,
          maxAds: MAX_ADS_PER_PANEL,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch ads for placement "${placement}"`,
        error,
      );
      return {
        data: [],
        placement,
        meta: { total: 0, maxAds: MAX_ADS_PER_PANEL },
      };
    }
  }

  /**
   * Round-robin rotation among ads with the same payment_amount tier
   * BR-MATCH-050: Session-based round-robin
   */
  private async rotateAds(
    ads: AdvertisementWithShop[],
    sessionId: string,
    placement: string,
  ): Promise<AdvertisementWithShop[]> {
    if (ads.length <= 1) return ads.slice(0, MAX_ADS_PER_PANEL);

    // Group ads by payment_amount tier
    const tiers = this.groupByTier(ads);

    const redisKey = `ad_rotation:${sessionId}:${placement}`;

    try {
      // Get current rotation index from Redis
      const currentIndexStr = await this.redis.get(redisKey);
      let currentIndex = currentIndexStr ? parseInt(currentIndexStr, 10) : 0;

      // Select one ad from each tier using round-robin
      const selected: AdvertisementWithShop[] = [];
      for (const tier of tiers) {
        if (tier.length > 0) {
          const index = currentIndex % tier.length;
          selected.push(tier[index]);
        }
      }

      // Increment index for next request (circular)
      const maxTierLength = Math.max(...tiers.map((t) => t.length), 1);
      currentIndex = (currentIndex + 1) % maxTierLength;

      // Save updated index back to Redis with 24h TTL
      await this.redis.set(redisKey, currentIndex.toString(), ROTATION_TTL);

      // Return up to MAX_ADS_PER_PANEL
      return selected.slice(0, MAX_ADS_PER_PANEL);
    } catch (error) {
      this.logger.warn(
        `Redis rotation failed for ${redisKey}, falling back to deterministic order`,
        error,
      );
      // Fallback: deterministic order (createdAt ASC)
      return ads.slice(0, MAX_ADS_PER_PANEL);
    }
  }

  /**
   * Group ads by payment_amount tier
   */
  private groupByTier(ads: AdvertisementWithShop[]): AdvertisementWithShop[][] {
    const tierMap = new Map<string, AdvertisementWithShop[]>();

    for (const ad of ads) {
      const tierKey = ad.paymentAmount?.toString() || '0';
      if (!tierMap.has(tierKey)) {
        tierMap.set(tierKey, []);
      }
      tierMap.get(tierKey)!.push(ad);
    }

    // Return tiers sorted by payment_amount desc (highest paying first)
    return Array.from(tierMap.entries())
      .sort((a, b) => {
        const valA = parseFloat(a[0]) || 0;
        const valB = parseFloat(b[0]) || 0;
        return valB - valA;
      })
      .map(([, tierAds]) => tierAds);
  }

  trackClick(adId: string, placement?: string) {
    this.logger.log(`Ad click tracked: ${adId} at ${placement ?? 'unknown'}`);
    return { data: { recorded: true } };
  }

  trackImpression(adIds: string[]) {
    this.logger.log(`Ad impressions tracked: ${adIds.length} ads`);
    return { data: { recorded: adIds.length } };
  }
}
