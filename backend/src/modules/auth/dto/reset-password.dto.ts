import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token from email',
    example: 'abc123def456...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @ApiProperty({
    description: 'New password (min 8 chars, uppercase, lowercase, number, special char)',
    example: 'NewP@ssw0rd',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])/, {
    message: 'Password must contain at least 1 lowercase letter',
  })
  @Matches(/^(?=.*[A-Z])/, {
    message: 'Password must contain at least 1 uppercase letter',
  })
  @Matches(/^(?=.*\d)/, {
    message: 'Password must contain at least 1 number',
  })
  @Matches(/^(?=.*[@$!%*?&])/, {
    message: 'Password must contain at least 1 special character',
  })
  password: string;
}
