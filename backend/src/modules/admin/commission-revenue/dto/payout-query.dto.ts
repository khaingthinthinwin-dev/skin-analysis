import {
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  IsString,
  Matches,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
}

export class PayoutQueryDto {
  @IsOptional()
  @IsEnum(PayoutStatus, { message: 'Invalid status' })
  status?: PayoutStatus;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid from date' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid to date' })
  to?: string;

  @IsOptional()
  merchantId?: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Invalid period' })
  period?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

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
