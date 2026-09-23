import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { SUMMARY_PERIOD_VALUES, SummaryPeriod } from './order-insights.types';
import { ORDER_INSIGHTS_CONFIG } from '../order-insights.config';

export class SummaryQueryDto {
  @IsOptional()
  @IsIn(SUMMARY_PERIOD_VALUES, { message: 'Invalid period' })
  period: SummaryPeriod = ORDER_INSIGHTS_CONFIG.defaultSummaryPeriod;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid date range' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid date range' })
  to?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid merchantId' })
  merchantId?: string;
}
