import { IsOptional, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class HistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;

  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be an ISO 8601 date string' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be an ISO 8601 date string' })
  dateTo?: string;
}

export class TrendsQueryDto {
  @IsOptional()
  range?: '30d' | '90d' | '1y' | 'all' = 'all';
}
