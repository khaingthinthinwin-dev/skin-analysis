import {
  IsString,
  IsNotEmpty,
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

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  @MaxLength(255, { message: 'Product name must not exceed 255 characters' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Short description is required' })
  @MaxLength(500, {
    message: 'Short description must not exceed 500 characters',
  })
  shortDescription: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  categoryId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'SKU must not exceed 100 characters' })
  sku?: string;

  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0.01, { message: 'Price must be greater than 0' })
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsNumber({}, { message: 'Compare at price must be a number' })
  @Min(0, { message: 'Compare at price must be 0 or greater' })
  @Validate(ComparePriceGreaterThanPriceValidator)
  @Type(() => Number)
  compareAtPrice?: number;

  @IsInt({ message: 'Stock quantity must be a whole number' })
  @Min(0, { message: 'Stock quantity must be 0 or greater' })
  @Type(() => Number)
  stockQuantity: number = 0;

  @IsOptional()
  @IsInt({ message: 'Low stock threshold must be a whole number' })
  @Min(0, { message: 'Low stock threshold must be 0 or greater' })
  @Type(() => Number)
  lowStockThreshold?: number = 10;

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
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: unknown }): boolean => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  isFeatured?: boolean = false;
}
