import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ message: 'At least one product ID is required' })
  ids: string[];
}
