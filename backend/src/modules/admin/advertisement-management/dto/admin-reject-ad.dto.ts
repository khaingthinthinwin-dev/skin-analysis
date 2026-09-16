import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AdminRejectAdDto {
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @MaxLength(1000, {
    message: 'Rejection reason must not exceed 1000 characters',
  })
  rejection_reason: string;
}
