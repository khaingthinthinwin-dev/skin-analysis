import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAdvertisementsDto {
  @IsEnum(['pending', 'approved', 'rejected'])
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

export class ApproveAdDto {
  @IsString()
  adId!: string;
}

export class RejectAdDto {
  @IsString()
  adId!: string;

  @IsString()
  reason!: string;
}

export class UpdateAdFeeSettingDto {
  @IsString()
  settingId!: string;

  daily_rate!: number;
}
