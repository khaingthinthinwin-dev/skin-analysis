import { IsString, IsNotEmpty, IsEnum, Matches } from 'class-validator';

export enum TargetPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}

export class SaveRevenueTargetDto {
  @IsString()
  @IsNotEmpty({ message: 'Target amount is required' })
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message:
      'Target amount must be a positive number with up to 2 decimal places',
  })
  targetAmount: string;

  @IsEnum(TargetPeriod, { message: 'Invalid target period' })
  targetPeriod: TargetPeriod;
}
