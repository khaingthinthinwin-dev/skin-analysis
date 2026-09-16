import { IsOptional, IsEnum } from 'class-validator';
import { TrendRange } from './revenue-trend-query.dto';

export class RevenueForecastQueryDto {
  @IsOptional()
  @IsEnum(TrendRange, { message: 'Invalid range' })
  range?: TrendRange;
}
