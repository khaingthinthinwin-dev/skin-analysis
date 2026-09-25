import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AdminAdListQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'], {
    message: 'Invalid status filter',
  })
  status?: string;

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
  @IsString()
  @MaxLength(255, { message: 'Shop search must not exceed 255 characters' })
  shop?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be a valid date' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be a valid date' })
  dateTo?: string;

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
