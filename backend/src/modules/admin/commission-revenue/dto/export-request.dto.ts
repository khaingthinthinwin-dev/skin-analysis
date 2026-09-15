import {
  IsEnum,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsString,
} from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
}

export type GroupByType = 'merchant' | 'day' | 'order';

export class ExportRequestDto {
  @IsDateString({}, { message: 'Invalid start date' })
  @IsNotEmpty({ message: 'Start date is required' })
  dateFrom: string;

  @IsDateString({}, { message: 'Invalid end date' })
  @IsNotEmpty({ message: 'End date is required' })
  dateTo: string;

  @IsEnum(ExportFormat, { message: 'Invalid export format. Use CSV or Excel.' })
  format: ExportFormat;

  @IsOptional()
  @IsIn(['merchant', 'day', 'order'], {
    message: 'groupBy must be merchant, day, or order',
  })
  groupBy?: GroupByType;

  @IsOptional()
  @IsString()
  merchantId?: string;
}
