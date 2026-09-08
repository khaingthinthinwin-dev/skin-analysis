import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShippingAddressDto } from './shipping-address.dto';

export class CreateOrderDto {
  @ApiProperty({ description: 'Shipping address' })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty({
    description: 'Payment method',
    enum: ['cod', 'bank_transfer', 'card'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['cod', 'bank_transfer', 'card'])
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'Coupon code' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ description: 'Order notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
