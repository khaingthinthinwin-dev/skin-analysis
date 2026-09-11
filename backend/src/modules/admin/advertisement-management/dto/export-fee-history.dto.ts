import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
} from 'class-validator';

export class ExportFeeHistoryDto {
  @IsDateString({}, { message: 'dateFrom must be a valid date' })
  dateFrom: string;

  @IsDateString({}, { message: 'dateTo must be a valid date' })
  dateTo: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(
    ['homepage_banner', 'product_sidebar', 'category_banner', 'search_top'],
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

  @IsIn(['csv'], { message: 'Export format must be csv' })
  format: 'csv';
}
