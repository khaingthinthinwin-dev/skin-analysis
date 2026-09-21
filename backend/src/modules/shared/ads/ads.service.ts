import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import type { Advertisement } from '@prisma/client';

const ROTATION_TTL = 24 * 60 * 60; // 24 hours
const MAX_ADS_PER_PANEL = 5;

type AdvertisementWithShop = Advertisement & {
  shop: { id: string; name: string };
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

    try {
      // Get all eligible ads sorted by payment amount (desc) then createdAt (desc)
      const ads = await this.prisma.advertisement.findMany({
        where: {
          isActive: true,
          approvalStatus: 'approved',
          paymentStatus: 'completed',
          startsAt: { lte: now },
          expiresAt: { gt: now },
        },
        include: {
          shop: {
            select: {
              id: true,
              name: true,
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

      return {
        data: selectedAds.map((ad) => ({
          adId: ad.id,
          title: ad.title,
          description: ad.content,
          imageUrl: ad.imageUrl || '',
          linkUrl: ad.linkUrl || null,
          ctaText: ad.announcementMessage || 'Shop Now',
          priorityAmount: ad.paymentAmount?.toString() || null,
          shopName: ad.shop.name,
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
