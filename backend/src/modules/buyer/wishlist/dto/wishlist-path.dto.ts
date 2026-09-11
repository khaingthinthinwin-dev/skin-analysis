import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WishlistPathDto {
  @ApiProperty({ description: 'Product UUID' })
  @IsUUID('4', { message: 'Invalid product ID format' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;
}
