import { IsString, IsNotEmpty, Length, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCodeDto {
  @ApiProperty({
    description: 'Email address used for password reset',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: '6-digit verification code sent to email',
    example: '482916',
  })
  @IsString()
  @IsNotEmpty({ message: 'Verification code is required' })
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  code: string;
}
