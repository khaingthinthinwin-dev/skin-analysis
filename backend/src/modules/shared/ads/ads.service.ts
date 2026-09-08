import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAdsByPlacement(placement: string) {
    const now = new Date();

    try {
      const ads = await this.prisma.advertisement.findMany({
        where: {
          isActive: true,
          approvalStatus: 'approved',
          expiresAt: { gte: now },
        },
        include: {
          shop: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      return ads.map((ad) => ({
        id: ad.id,
        title: ad.title,
        description: ad.content,
        imageUrl: ad.imageUrl || '',
        ctaText: ad.announcementMessage,
        ctaUrl: ad.linkUrl,
        placement,
        shopName: ad.shop.name,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch ads for placement "${placement}"`,
        error,
      );
      return [];
    }
  }

  trackClick(adId: string, placement?: string) {
    this.logger.log(`Ad click tracked: ${adId} at ${placement ?? 'unknown'}`);
    return { success: true, adId };
  }

  trackImpression(adIds: string[]) {
    this.logger.log(`Ad impressions tracked: ${adIds.length} ads`);
    return { success: true, count: adIds.length };
  }
}
