import { IsArray, ArrayNotEmpty } from 'class-validator';

export class DeleteAnalysesDto {
  @IsArray({ message: 'IDs must be an array' })
  @ArrayNotEmpty({ message: 'At least one analysis ID is required' })
  ids!: string[];
}
