import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';

export class UpdatePromotionDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  discountTypeCode?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  discountValue?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number | null;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUses?: number | null;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
