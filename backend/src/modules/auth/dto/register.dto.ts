import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsIn,
  IsOptional,
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
}
