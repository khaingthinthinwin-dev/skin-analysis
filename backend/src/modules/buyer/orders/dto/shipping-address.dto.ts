import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShippingAddressDto {
  @ApiProperty({ description: 'Recipient full name' })
  @IsString()
  @IsNotEmpty({ message: 'Recipient name is required' })
  @MaxLength(200)
  recipientName: string;

  @ApiProperty({ description: 'Contact phone number' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @MaxLength(20)
  phone: string;

  @ApiProperty({ description: 'Street address line 1' })
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @MaxLength(255)
  addressLine1: string;

  @ApiPropertyOptional({ description: 'Street address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  @MaxLength(100)
  city: string;

  @ApiProperty({ description: 'State or province' })
  @IsString()
  @IsNotEmpty({ message: 'State is required' })
  @MaxLength(100)
  state: string;

  @ApiProperty({ description: 'Postal or ZIP code' })
  @IsString()
  @IsNotEmpty({ message: 'Postal code is required' })
  @MaxLength(20)
  postalCode: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  @IsNotEmpty({ message: 'Country is required' })
  @MaxLength(100)
  country: string;
}
