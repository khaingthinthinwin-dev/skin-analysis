import { IsNumber, IsOptional, IsInt, Min, Max, MinLength, MaxLength, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCommissionSettingsDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  commission_rate!: number;
}

export class GetPayoutsDto {
  @IsEnum(['pending', 'processing', 'completed', 'failed'])
  @IsOptional()
  status?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class ProcessPayoutDto {
  @IsString()
  payoutId!: string;
}
