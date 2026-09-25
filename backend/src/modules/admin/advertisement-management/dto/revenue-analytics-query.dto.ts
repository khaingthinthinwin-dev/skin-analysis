import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
} from 'class-validator';

const toArray = ({ value }: { value?: unknown }) =>
  Array.isArray(value) ? value : value ? [value] : undefined;

export class RevenueAnalyticsQueryDto {
  @IsDateString({}, { message: 'dateFrom must be a valid date' })
  dateFrom: string;

  @IsDateString({}, { message: 'dateTo must be a valid date' })
  dateTo: string;

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(
    [
      'search_page_banner',
      'recommendation_page_banner',
      'checkout_page_banner',
      'productDetail_page_banner',
    ],
    {
      each: true,
      message: 'Invalid placement filter',
    },
  )
  placement?: string[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(['basic', 'standard', 'premium'], {
    each: true,
    message: 'Invalid tier filter',
  })
  tier?: string[];
}
