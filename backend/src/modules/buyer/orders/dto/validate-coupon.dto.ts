import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty({ description: 'Coupon code to validate', example: 'SUMMER10' })
  @IsString()
  @IsNotEmpty({ message: 'Coupon code is required' })
  couponCode: string;

  @ApiProperty({ description: 'Current order subtotal', example: 59.99 })
  @IsNumber()
  @Min(0.01, { message: 'Subtotal must be greater than 0' })
  subtotal: number;
}
