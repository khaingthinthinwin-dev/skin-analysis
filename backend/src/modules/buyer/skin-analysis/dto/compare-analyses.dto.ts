import { IsUUID, IsNotEmpty } from 'class-validator';

export class CompareAnalysesDto {
  @IsNotEmpty({ message: 'analysisId1 is required' })
  @IsUUID('4', { message: 'analysisId1 must be a valid UUID v4' })
  analysisId1: string;

  @IsNotEmpty({ message: 'analysisId2 is required' })
  @IsUUID('4', { message: 'analysisId2 must be a valid UUID v4' })
  analysisId2: string;
}
