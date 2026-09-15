import {
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export type GroupByType = 'merchant' | 'day' | 'order';

export class CommissionReportQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'Invalid from date' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid to date' })
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(['merchant', 'day', 'order'], {
    message: 'groupBy must be merchant, day, or order',
  })
  groupBy?: GroupByType;
}
