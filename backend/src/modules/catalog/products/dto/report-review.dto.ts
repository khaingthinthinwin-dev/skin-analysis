import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';

export class ReportReviewDto {
  @IsEnum(['spam', 'inappropriate', 'fake', 'other'])
  reason!: 'spam' | 'inappropriate' | 'fake' | 'other';

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  detail?: string;
}
