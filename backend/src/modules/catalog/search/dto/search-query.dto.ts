import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsArray,
  IsNumber,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SortField {
  PRICE = 'price',
  RATING = 'rating',
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SkinType {
  DRY = 'dry',
  OILY = 'oily',
  COMBINATION = 'combination',
  SENSITIVE = 'sensitive',
  NORMAL = 'normal',
}

export class SearchQueryDto {
  @ApiPropertyOptional({
    description: 'Keyword for partial matching search',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Keyword must be 255 characters or fewer' })
  q?: string;

  @ApiPropertyOptional({
    description: 'Category filter UUID (includes descendants)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Invalid category ID' })
  categoryId?: string;

  @ApiPropertyOptional({
    enum: SkinType,
    isArray: true,
    description: 'Skin type filter',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SkinType, { each: true, message: 'Invalid skin type' })
  skinTypes?: SkinType[];

  @ApiPropertyOptional({ type: [String], description: 'Ingredient filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  ingredients?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Product tag filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({ description: 'Lower price bound', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Minimum price must be 0 or more' })
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Upper price bound', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Maximum price must be 0 or more' })
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Minimum average rating (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Rating must be between 1 and 5' })
  @Max(5, { message: 'Rating must be between 1 and 5' })
  rating?: number;

  @ApiPropertyOptional({
    enum: SortField,
    default: SortField.CREATED_AT,
    description: 'Sort field',
  })
  @IsOptional()
  @IsEnum(SortField, { message: 'Invalid sort field' })
  sort?: SortField = SortField.CREATED_AT;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
    description: 'Sort direction',
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'Invalid sort direction' })
  order?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Limit must be between 1 and 100' })
  @Max(100, { message: 'Limit must be between 1 and 100' })
  limit?: number = 20;
}
