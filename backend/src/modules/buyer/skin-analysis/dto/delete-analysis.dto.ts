import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class DeleteAnalysisDto {
  @IsUUID('4', { each: true, message: 'Each ID must be a valid UUID v4' })
  @ArrayNotEmpty({ message: 'At least one analysis ID is required' })
  ids!: string[];
}

export class DeleteAnalysesDto {
  @IsArray({ message: 'IDs must be an array' })
  @ArrayNotEmpty({ message: 'At least one analysis ID is required' })
  ids!: string[];
}
