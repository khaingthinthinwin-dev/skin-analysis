import {
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
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
