import { IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

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
}
