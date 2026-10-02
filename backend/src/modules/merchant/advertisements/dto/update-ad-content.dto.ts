import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
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

  // Optional so an edit that does not touch the image keeps the currently saved
  // one. When present it must still be one of the merchant's own product images
  // (see UploadAdContentDto.imageUrl).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  imageUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  announcementMessage: string;

  // Optional reschedule for the resubmission flow: a rejected ad's original
  // window may already have started or passed, so the merchant may re-pick
  // the start date when editing before resubmitting. `expires_at` is derived
  // server-side from the package duration (see getSchedule).
  @IsOptional()
  @IsDateString()
  startsAt?: string;
}
