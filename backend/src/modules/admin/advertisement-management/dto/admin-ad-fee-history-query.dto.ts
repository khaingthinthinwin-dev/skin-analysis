import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminAdFeeHistoryQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(
    [
      'search_page_banner',
      'recommendation_page_banner',
      'checkout_page_banner',
      'productDetail_page_banner',
    ],
    {
      message: 'Invalid placement filter',
    },
  )
  placement?: string;

  @IsOptional()
  @IsString()
  @IsIn(['basic', 'standard', 'premium'], {
    message: 'Invalid tier filter',
  })
  tier?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
