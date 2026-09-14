import { IsEnum, IsDateString, IsNotEmpty } from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
}

export class ExportRequestDto {
  @IsDateString({}, { message: 'Invalid start date' })
  @IsNotEmpty({ message: 'Start date is required' })
  dateFrom: string;

  @IsDateString({}, { message: 'Invalid end date' })
  @IsNotEmpty({ message: 'End date is required' })
  dateTo: string;

  @IsEnum(ExportFormat, { message: 'Invalid export format. Use CSV or Excel.' })
  format: ExportFormat;
}
