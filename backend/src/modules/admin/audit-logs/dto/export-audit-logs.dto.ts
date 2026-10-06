import { OmitType } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ListAuditLogsDto } from './list-audit-logs.dto';

export enum ExportFormat {
  CSV = 'csv',
}

export class ExportAuditLogsDto extends OmitType(ListAuditLogsDto, [
  'page',
  'limit',
  'sortBy',
  'sortOrder',
] as const) {
  @IsEnum(ExportFormat)
  format!: ExportFormat.CSV;
}
