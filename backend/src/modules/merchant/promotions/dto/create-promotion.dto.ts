import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  discountTypeCode!: string;

  @IsNumber()
  @Min(0.01)
  discountValue!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUses?: number;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  expiresAt!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
