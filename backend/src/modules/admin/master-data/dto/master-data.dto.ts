import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateMasterDataDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(120, { message: 'Name must not exceed 120 characters' })
  name: string;

  @IsString({ message: 'Slug must be a string' })
  @IsOptional()
  @Matches(SLUG_PATTERN, {
    message: 'Slug must contain only lowercase letters, numbers and hyphens',
  })
  @MaxLength(140, { message: 'Slug must not exceed 140 characters' })
  slug?: string;
}
