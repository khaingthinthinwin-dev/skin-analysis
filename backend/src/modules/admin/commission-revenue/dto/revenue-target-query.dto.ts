import { IsOptional, IsEnum } from 'class-validator';
import { TargetPeriod } from './save-revenue-target.dto';

export class RevenueTargetQueryDto {
  @IsOptional()
  @IsEnum(TargetPeriod, { message: 'Invalid target period' })
  period?: TargetPeriod;
}
