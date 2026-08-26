import {
  IsString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AdminRole {
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export class CreateAdminDto {
  @ApiProperty({
    description: 'Admin user full name',
    example: 'John Admin',
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(200, { message: 'Name must be 200 characters or less' })
  name: string;

  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@example.com',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255)
  email: string;

  @ApiProperty({
    description:
      'Admin password (min 8 chars, uppercase, lowercase, number, special char)',
    example: 'AdminP@ssw0rd',
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

  @ApiProperty({
    description: 'Admin role',
    enum: AdminRole,
    default: AdminRole.ADMIN,
  })
  @IsEnum(AdminRole, { message: 'Invalid role' })
  @IsNotEmpty({ message: 'Role is required' })
  role: AdminRole;
}
