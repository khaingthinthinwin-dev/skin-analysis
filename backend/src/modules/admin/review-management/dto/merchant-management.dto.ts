import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMerchantsDto {
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

export class ApproveMerchantDto {
  @IsString()
  @IsOptional()
  adminId?: string;
}

export class RejectMerchantDto {
  @IsString()
  reason!: string;

  @IsString()
  @IsOptional()
  adminId?: string;
}
