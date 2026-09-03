import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsArray,
  MaxLength,
  Min,
  IsIn,
  Validate,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ComparePriceGreaterThanPriceValidator } from './compare-price.validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Product name must not exceed 255 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Short description must not exceed 500 characters',
  })
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'SKU must not exceed 100 characters' })
  sku?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0.01, { message: 'Price must be greater than 0' })
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Compare at price must be a number' })
  @Min(0, { message: 'Compare at price must be 0 or greater' })
  @Validate(ComparePriceGreaterThanPriceValidator)
  @Type(() => Number)
  compareAtPrice?: number;

  @IsOptional()
  @IsInt({ message: 'Stock quantity must be a whole number' })
  @Min(0, { message: 'Stock quantity must be 0 or greater' })
  @Type(() => Number)
  stockQuantity?: number;

  @IsOptional()
  @IsInt({ message: 'Low stock threshold must be a whole number' })
  @Min(0, { message: 'Low stock threshold must be 0 or greater' })
  @Type(() => Number)
  lowStockThreshold?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }): string[] => {
    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? (value as string[]) : [];
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(['dry', 'oily', 'combination', 'sensitive', 'normal'], { each: true })
  skinTypes?: string[];

  @IsOptional()
  @Transform(({ value }: { value: unknown }): string[] => {
    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? (value as string[]) : [];
  })
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];

  @IsOptional()
  @Transform(({ value }: { value: unknown }): string[] => {
    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? (value as string[]) : [];
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: unknown }): boolean => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: unknown }): boolean => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  isFeatured?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: unknown }): string[] => {
    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? (value as string[]) : [];
  })
  @IsArray()
  @IsString({ each: true })
  retainedImageUrls?: string[];
}
