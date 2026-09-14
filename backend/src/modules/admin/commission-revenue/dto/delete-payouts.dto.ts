import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class DeletePayoutsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  payoutIds!: string[];
}
