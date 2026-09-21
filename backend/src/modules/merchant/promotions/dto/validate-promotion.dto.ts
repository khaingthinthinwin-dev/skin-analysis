import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ValidatePromotionDto {
  @ApiProperty({ description: 'Coupon code to validate', example: 'SALE10' })
  @IsString()
  @IsNotEmpty({ message: 'Coupon code is required' })
  couponCode: string;

  @ApiProperty({ description: 'Cart subtotal in MMK', example: 5000 })
  @IsNumber({}, { message: 'Subtotal must be a number' })
  @Min(0, { message: 'Subtotal must be 0 or greater' })
  @Type(() => Number)
  subtotal: number;
}
