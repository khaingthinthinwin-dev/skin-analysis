import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^$|^\+?[0-9()\-\s]{7,20}$/, {
    message:
      'Phone number must be 7-20 characters and contain only digits, spaces, +, - and parentheses',
  })
  phone?: string;

  @ApiPropertyOptional({
    example: '123 Yangon Street, Yangon',
    description: 'Shop address (stored on the shop row, merchants only)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
