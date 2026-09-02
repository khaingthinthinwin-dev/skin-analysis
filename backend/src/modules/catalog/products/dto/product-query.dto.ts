import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsIn,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  skinType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  @IsIn(['price', 'rating', 'newest', 'name'])
  sortBy?: string = 'newest';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  isActive?: string;

  @IsOptional()
  @IsString()
  isFeatured?: string;
}
