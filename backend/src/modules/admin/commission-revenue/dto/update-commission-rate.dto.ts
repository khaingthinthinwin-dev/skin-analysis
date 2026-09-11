import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class UpdateCommissionRateDto {
  @IsString()
  @IsNotEmpty({ message: 'Commission rate is required' })
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Commission rate must be a number with up to 2 decimal places',
  })
  rate: string;
}
