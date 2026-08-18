import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, Matches } from 'class-validator';

export class AddToCartDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ID is required' })
  @Matches(/^c[a-z0-9]{24,}$/, { message: 'Invalid product ID format' })
  productId: string;

  @IsOptional()
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(99, { message: 'Quantity cannot exceed 99' })
  quantity?: number = 1;
}
