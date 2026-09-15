import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateAdContentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  linkUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  announcementMessage: string;
}
