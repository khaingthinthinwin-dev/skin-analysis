import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAdsByPlacement(placement: string, _sessionId?: string) {
    const now = new Date();

    try {
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
        take: 5,
        orderBy: [{ paymentAmount: 'desc' }, { createdAt: 'desc' }],
      });

      return {
        data: ads.map((ad) => ({
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
          total: ads.length,
          maxAds: 5,
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
        meta: { total: 0, maxAds: 5 },
      };
    }
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
