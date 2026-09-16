import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ExportSubmissionHistoryDto {
  @IsDateString({}, { message: 'dateFrom must be a valid date' })
  dateFrom: string;

  @IsDateString({}, { message: 'dateTo must be a valid date' })
  dateTo: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Shop filter must not exceed 255 characters' })
  shop?: string;

  @IsIn(['csv'], { message: 'Export format must be csv' })
  format: 'csv';
}
