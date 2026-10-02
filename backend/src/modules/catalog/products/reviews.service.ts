import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ReportReviewDto } from './dto/report-review.dto';

const REASON_LABELS: Record<ReportReviewDto['reason'], string> = {
  spam: 'Spam',
  inappropriate: 'Inappropriate content',
  fake: 'Fake review',
  other: 'Other',
};

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async reportReview(reviewId: string, userId: string, dto: ReportReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    const existing = await this.prisma.reviewReport.findFirst({
      where: { reviewId, reportedBy: userId },
    });
    if (existing)
      throw new ConflictException('You have already reported this review');

    const report = await this.prisma.reviewReport.create({
      data: {
        reviewId,
        reportedBy: userId,
        reason: dto.reason,
        description: dto.detail,
        status: 'pending',
      },
    });

    await this.notifyAdminsOfReport(report.id, dto.reason);

    return report;
  }

  /**
   * Creates an in-app notification for every admin so the report surfaces in the
   * admin Notifications Center. Failures are logged but never break reporting.
   */
  private async notifyAdminsOfReport(
    reportId: string,
    reason: ReportReviewDto['reason'],
  ): Promise<void> {
    try {
      const admins = await this.prisma.user.findMany({
        where: { roleCode: { in: ['admin', 'super_admin'] } },
        select: { id: true },
      });
      if (admins.length === 0) {
        return;
      }

      await this.prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: 'REVIEW_REPORTED',
          title: 'Review reported',
          message: `A review was reported as "${REASON_LABELS[reason]}" and is pending moderation.`,
          entityType: 'ReviewReport',
          entityId: reportId,
        })),
        skipDuplicates: true,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to notify admins of review report "${reportId}": ${(error as Error).message}`,
      );
    }
  }
}
