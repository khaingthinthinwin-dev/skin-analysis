import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ReportReviewDto } from './dto/report-review.dto';

@Injectable()
export class ReviewsService {
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

    return this.prisma.reviewReport.create({
      data: {
        reviewId,
        reportedBy: userId,
        reason: dto.reason,
        description: dto.detail,
        status: 'pending',
      },
    });
  }
}
