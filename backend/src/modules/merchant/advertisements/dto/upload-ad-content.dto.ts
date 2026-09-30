import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UploadAdContentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  // The advertisement image must be one of the merchant's own product images.
  // This is a stored upload path (e.g. /uploads/products/<file>) rather than a
  // free-form URL; the service rejects any value that does not belong to one
  // of the merchant's products, so no new file is accepted here.
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  imageUrl: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  announcementMessage: string;

  @IsDateString()
  startsAt: string;
}
