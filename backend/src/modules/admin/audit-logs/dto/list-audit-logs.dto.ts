import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum AuditSortBy {
  CREATED_AT = 'created_at',
  ACTION = 'action',
  ENTITY_TYPE = 'entity_type',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

const toUndefinedIfMissing = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : value;

const toStringArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const toText = (item: unknown): string =>
    typeof item === 'string'
      ? item
      : typeof item === 'number' || typeof item === 'boolean'
        ? String(item)
        : '';
  return Array.isArray(value)
    ? value.map(toText).filter((t) => t !== '')
    : [toText(value)].filter((t) => t !== '');
};

export class ListAuditLogsDto {
  @IsOptional()
  @Transform(toUndefinedIfMissing)
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
  @Transform(toUndefinedIfMissing)
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @Transform(toUndefinedIfMissing)
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @Transform(toUndefinedIfMissing)
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Transform(toUndefinedIfMissing)
  @IsString()
  @MaxLength(45)
  ipAddress?: string;

  @IsOptional()
  @Transform(toUndefinedIfMissing)
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
