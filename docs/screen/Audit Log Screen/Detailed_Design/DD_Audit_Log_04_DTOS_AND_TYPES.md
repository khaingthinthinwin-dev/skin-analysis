# DD_AUDIT_04 — DTOs and Types

> **Doc ID:** SKM-DD-AUDIT-04 | **Version:** 1.3 | **Status:** Draft  
> **Last Updated:** 2026-10-21

---

## 1. Overview

Request DTOs reside in `src/modules/admin/audit-logs/dto/` and use `class-validator` with a global whitelist/forbid-non-whitelisted validation pipe. Dates are ISO-8601 dates or datetimes with an explicit offset; date-only values are expanded to Myanmar Time (UTC+6:30) day boundaries by the service.

## 2. Shared Enums

```typescript
export enum AuditSortBy {
  CREATED_AT = 'created_at',
  ACTION = 'action',
  ENTITY_TYPE = 'entity_type',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum ExportFormat {
  CSV = 'csv',
}
```

## 3. Request DTOs

### 3.1 ListAuditLogsDto

```typescript
export class ListAuditLogsDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : value))
  @IsUUID()
  userId?: string;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  action?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  entityType?: string[];

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : value))
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : value))
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : value))
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : value))
  @IsString()
  @MaxLength(45)
  ipAddress?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : value))
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;

  @IsOptional()
  @IsEnum(AuditSortBy)
  sortBy: AuditSortBy = AuditSortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}
```

`toStringArray` normalizes a single or repeated query value into an array and drops empty entries. The server default `limit` is 50; the Admin Audit Log screen requests 10 and offers 10/20/50/100.

### 3.2 ExportAuditLogsDto

```typescript
export class ExportAuditLogsDto extends OmitType(ListAuditLogsDto, [
  'page',
  'limit',
  'sortBy',
  'sortOrder',
] as const) {
  @IsEnum(ExportFormat)
  format!: ExportFormat.CSV;
}
```

Export-specific validation (applied in service, not DTO):
- `dateFrom` and `dateTo` must both be provided if either is given (partial range rejected).
- `dateTo >= dateFrom`.
- Maximum range: 365 days (measured to the end of the selected end day).
- Maximum matching rows: 10,000 (checked after query count, before file generation).

### 3.3 DeleteAuditLogsDto

```typescript
export class DeleteAuditLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  // The service validates this value against AUDIT_LOG_MIN_RETENTION_DAYS; 90 is its default.
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
```

Delete-specific validation (applied in service):
- `olderThanDays` is always validated server-side against `AUDIT_LOG_MIN_RETENTION_DAYS` (defaults to 90).
- If `recordIds` are provided, the request is atomic: every target must exist and be eligible (`created_at < now - olderThanDays`), or the service rejects the entire request and deletes nothing.
- If no IDs are provided, all eligible records older than `olderThanDays` are deleted.
- `fileIds` is accepted but ignored; `deletedFiles` is always `0`.

## 4. Response Types

### 4.1 AuditLogListItemDto

```typescript
export interface AuditLogListItemDto {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  entityType: string;
  summary: string;
  ipAddress: string | null;
  createdAt: Date;
}
```

`entityId` is intentionally excluded from the response DTOs — it is stored in the database and accepted as a filter, but never returned to the client.

### 4.2 AuditLogDetailDto

```typescript
export interface AuditLogDetailDto extends AuditLogListItemDto {
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  userAgent: string | null;
}
```

### 4.3 PaginatedAuditLogsDto

```typescript
export interface PaginatedAuditLogsDto {
  items: AuditLogListItemDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 4.4 AuditFilterOptionsDto

```typescript
export interface AuditFilterOptionsDto {
  actions: string[];
  entityTypes: string[];
}
```

### 4.5 CsvExportFile

```typescript
export interface CsvExportFile {
  filename: string;
  content: Buffer;
}
```

The export response is the CSV attachment itself (`Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment`). There is no `downloadUrl` and no `expiresAt` — nothing is stored server-side.

### 4.6 DeleteAuditLogsResponseDto

```typescript
export interface DeleteAuditLogsResponseDto {
  deletedRecords: number;
  deletedFiles: number; // always 0
}
```

## 5. Persistence and Internal Types

```typescript
export interface AuditLogRecord {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: unknown | null;
  newValue: unknown | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface DeleteResult {
  deletedRecords: number;
  deletedFiles: number; // always 0
}
```

No export-file metadata type exists: exports are streamed and never persisted.

## 6. Error Contract

### 6.1 Error Response Structure (matches FDS §9.1)

```typescript
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}
```

Example:
```json
{
  "statusCode": 400,
  "message": ["dateTo must be greater than or equal to dateFrom"],
  "error": "Bad Request",
  "timestamp": "2026-08-25T12:00:00.000Z",
  "path": "/api/v1/admin/audit-logs"
}
```

### 6.2 Audit-Specific Error Codes

```typescript
export enum AuditErrorCode {
  INVALID_FILTER = 'INVALID_FILTER',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  EXPORT_LIMIT_EXCEEDED = 'EXPORT_LIMIT_EXCEEDED',
  EXPORT_READ_ONLY = 'EXPORT_READ_ONLY',
  LOG_NOT_FOUND = 'LOG_NOT_FOUND',
  RETENTION_TOO_SHORT = 'RETENTION_TOO_SHORT',
  NO_ELIGIBLE_TARGETS = 'NO_ELIGIBLE_TARGETS',
}
```

## 7. Cross-References

See [API endpoints](./DD_Audit_Log_03_API_ENDPOINTS.md) and [business logic](./DD_Audit_Log_05_BUSINESS_LOGIC.md).
