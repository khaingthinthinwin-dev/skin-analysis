import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AdListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsIn(['active', 'inactive', 'expired'])
  status?: string;

  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  approvalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
