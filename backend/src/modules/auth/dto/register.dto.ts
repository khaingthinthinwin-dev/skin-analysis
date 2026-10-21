import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsIn,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    example: 'buyer',
    enum: ['buyer', 'merchant'],
    default: 'buyer',
  })
  @IsOptional()
  @IsIn(['buyer', 'merchant'], {
    message: 'Role must be either buyer or merchant',
  })
  role?: 'buyer' | 'merchant';

  @ApiPropertyOptional({
    example: '123 Yangon Street, Yangon',
    description: 'Shop address (merchant registration only)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    example: '+95912345678',
    description: 'Shop contact number (merchant registration only)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[0-9()\-\s]{7,20}$/, {
    message:
      'Phone number must be 7-20 characters and contain only digits, spaces, +, - and parentheses',
  })
  phone?: string;
}
