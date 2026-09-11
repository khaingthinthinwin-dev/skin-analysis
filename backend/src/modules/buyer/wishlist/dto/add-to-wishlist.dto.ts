import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToWishlistDto {
  @ApiProperty({ description: 'Product UUID to add to wishlist' })
  @IsUUID('4', { message: 'Invalid product ID format' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;
}
