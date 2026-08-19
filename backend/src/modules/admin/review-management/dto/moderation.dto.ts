import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ApproveReviewDto {
  @IsString()
  reviewId!: string;
}

export class DeleteReviewDto {
  @IsString()
  reviewId!: string;
}

export class ResolveReportDto {
  @IsString()
  reportId!: string;

  @IsEnum(['resolved', 'rejected'])
  action!: 'resolved' | 'rejected';

  @IsString()
  @IsOptional()
  note?: string;
}

export class DeactivateProductDto {
  @IsString()
  productId!: string;
}
