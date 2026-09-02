import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteAllProductsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsString()
  isActive?: string;
}
