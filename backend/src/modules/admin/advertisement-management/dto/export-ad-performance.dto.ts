import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
} from 'class-validator';

export class ExportAdPerformanceDto {
  @IsDateString({}, { message: 'dateFrom must be a valid date' })
  dateFrom: string;

  @IsDateString({}, { message: 'dateTo must be a valid date' })
  dateTo: string;

  @IsOptional()
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
    },
  )
  placement?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(['basic', 'standard', 'premium'], {
    each: true,
  })
  tier?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(['pending', 'approved', 'rejected'], {
    each: true,
  })
  status?: string[];

  @IsIn(['csv'], { message: 'Export format must be csv' })
  format: 'csv';
}
