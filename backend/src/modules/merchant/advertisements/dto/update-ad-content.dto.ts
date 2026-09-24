import {
  IsDateString,
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

  // Optional reschedule for the resubmission flow: a rejected ad's original
  // window may already have started or passed, so the merchant may re-pick
  // the start date when editing before resubmitting. `expires_at` is derived
  // server-side from the package duration (see getSchedule).
  @IsOptional()
  @IsDateString()
  startsAt?: string;
}
