import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CartItemPathDto {
  @ApiProperty({ description: 'Cart item UUID' })
  @IsUUID('4', { message: 'Invalid cart item ID format' })
  @IsNotEmpty({ message: 'Cart item ID is required' })
  id: string;
}
