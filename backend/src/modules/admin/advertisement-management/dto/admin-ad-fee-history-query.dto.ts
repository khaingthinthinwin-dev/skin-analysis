import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

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
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Month filter must use the YYYY-MM format',
  })
  month?: string;

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
