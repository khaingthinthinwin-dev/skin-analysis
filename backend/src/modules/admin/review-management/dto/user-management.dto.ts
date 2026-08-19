import { IsString, IsBoolean, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetUsersDto {
  @IsEnum(['buyer', 'merchant', 'admin'])
  @IsOptional()
  role?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  is_active?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class ToggleUserStatusDto {
  @IsBoolean()
  is_active!: boolean;
}
