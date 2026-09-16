import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeactivateAdFeeSettingDto {
  @IsString()
  @IsNotEmpty({ message: 'Change reason is required' })
  @MaxLength(1000, {
    message: 'Change reason must not exceed 1000 characters',
  })
  change_reason: string;
}
