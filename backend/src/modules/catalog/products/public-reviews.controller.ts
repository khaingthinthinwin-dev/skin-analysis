import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../../../common/decorators/current-user.decorator';
import { ReportReviewDto } from './dto/report-review.dto';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class PublicReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':id/report')
  @HttpCode(HttpStatus.CREATED)
  async reportReview(
    @Param('id') id: string,
    @Body() dto: ReportReviewDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reviewsService.reportReview(id, user.id, dto);
  }
}
