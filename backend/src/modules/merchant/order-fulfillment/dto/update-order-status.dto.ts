import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString({ message: 'Invalid status' })
  @IsNotEmpty({ message: 'Invalid status' })
  status: string;
}
