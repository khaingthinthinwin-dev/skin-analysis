import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PayAdFeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;
}
