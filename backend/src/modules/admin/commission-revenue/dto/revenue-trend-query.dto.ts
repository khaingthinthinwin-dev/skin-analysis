import { IsEnum, IsOptional } from 'class-validator';

export enum TrendRange {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  ONE_YEAR = '1y',
}

export class RevenueTrendQueryDto {
  @IsOptional()
  @IsEnum(TrendRange, { message: 'Invalid range' })
  range?: TrendRange;
}
