import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAdFeeSettingDto {
  @IsNumber({}, { message: 'Daily rate must be a number' })
  @Min(0.01, { message: 'Daily rate must be greater than 0' })
  daily_rate: number;

  @IsInt({ message: 'Duration days must be a whole number' })
  @Min(1, { message: 'Duration must be at least 1 day' })
  duration_days: number;

  @IsInt({ message: 'Max ads must be a whole number' })
  @Min(1, { message: 'Max ads must be at least 1' })
  max_ads: number;

  @IsDate({ message: 'Effective from must be a valid date' })
  effective_from: Date;

  @IsString()
  @IsNotEmpty({ message: 'Change reason is required' })
  @MaxLength(1000, {
    message: 'Change reason must not exceed 1000 characters',
  })
  change_reason: string;
}
