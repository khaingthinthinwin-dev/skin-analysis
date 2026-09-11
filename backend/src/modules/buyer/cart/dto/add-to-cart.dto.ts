import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ description: 'Product UUID to add to cart' })
  @IsUUID('4', { message: 'Invalid product ID format' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;

  @ApiPropertyOptional({ description: 'Quantity to add (1-99)', default: 1 })
  @IsOptional()
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(99, { message: 'Quantity cannot exceed 99' })
  quantity?: number = 1;
}
