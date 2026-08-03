import { IsEmail, IsString, IsOptional, MinLength, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
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
  passwordHash: string;

  @ApiPropertyOptional({ example: 'buyer' })
  @IsOptional()
  @IsString()
  @IsIn(['buyer', 'merchant', 'admin'])
  roleCode?: string;
}
