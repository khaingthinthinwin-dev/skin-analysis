import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsIn,
  IsObject,
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

  @ApiPropertyOptional({ description: 'Coupon code (legacy single)' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({
    description: 'Per-shop voucher codes, e.g. { "merchant-id-1": "CODE1" }',
  })
  @IsOptional()
  @IsObject()
  voucherCodes?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Order notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
