import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class DeleteAuditLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  // The service validates this value against AUDIT_LOG_MIN_RETENTION_DAYS (90).
  olderThanDays: number = 90;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  recordIds?: string[];

  // Accepted for API-contract compatibility; CSV exports are streamed
  // directly and no export-file metadata table exists to delete from.
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  fileIds?: string[];
}
