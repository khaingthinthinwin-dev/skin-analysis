import {
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum ReviewAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export enum MerchantStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ReportAction {
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

export enum ReportReviewReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  FAKE = 'fake',
  OTHER = 'other',
}

export enum ReviewStatusFilter {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum MerchantStatusFilter {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ProductStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum UserStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ADMIN = 'admin',
}

export enum ReportStatusFilter {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

// ─── Request DTOs ───────────────────────────────────────────────────────────

export class ModerateReviewDto {
  @IsEnum(ReviewAction, {
    message: "action must be 'approve' or 'reject'",
  })
  @IsNotEmpty({ message: 'Action is required' })
  action!: ReviewAction;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}

export class ModerateMerchantDto {
  @IsEnum(MerchantStatus, {
    message: "status must be 'approved' or 'rejected'",
  })
  @IsNotEmpty({ message: 'Status is required' })
  status!: MerchantStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}

export class ModerateProductDto {
  @IsBoolean({ message: 'Active status must be a boolean' })
  @IsNotEmpty({ message: 'Active status is required' })
  isActive!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}

export class ModerateUserDto {
  @IsBoolean({ message: 'Active status must be a boolean' })
  @IsNotEmpty({ message: 'Active status is required' })
  isActive!: boolean;
}

export class UpdateReportStatusDto {
  @IsEnum(ReportAction, {
    message: "status must be 'reviewed', 'resolved', or 'rejected'",
  })
  @IsNotEmpty({ message: 'Status is required' })
  status!: ReportAction;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Admin note must not exceed 1000 characters' })
  adminNote?: string;
}

export class ReportReviewDto {
  @IsEnum(ReportReviewReason, {
    message: "reason must be 'spam', 'inappropriate', 'fake', or 'other'",
  })
  @IsNotEmpty({ message: 'Reason is required' })
  reason!: ReportReviewReason;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Detail must not exceed 500 characters' })
  detail?: string;
}

export class BulkModerateReviewsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one review ID is required' })
  @IsString({ each: true })
  ids!: string[];

  @IsEnum(ReviewAction, {
    message: "action must be 'approve' or 'reject'",
  })
  @IsNotEmpty({ message: 'Action is required' })
  action!: ReviewAction;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}

export class BulkDeleteReviewsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one review ID is required' })
  @IsString({ each: true })
  ids!: string[];
}

export class BulkModerateProductsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one product ID is required' })
  @IsString({ each: true })
  ids!: string[];

  @IsBoolean({ message: 'Active status must be a boolean' })
  @IsNotEmpty({ message: 'Active status is required' })
  isActive!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}

// ─── Query DTOs ─────────────────────────────────────────────────────────────

export class ReviewsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sort?: string = 'createdAt';

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsEnum(ReviewStatusFilter)
  status?: ReviewStatusFilter;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

export class MerchantsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sort?: string = 'createdAt';

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsEnum(MerchantStatusFilter)
  status?: MerchantStatusFilter;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

export class ProductsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sort?: string = 'createdAt';

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsEnum(ProductStatusFilter)
  status?: ProductStatusFilter;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

export class UsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sort?: string = 'createdAt';

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsEnum(UserStatusFilter)
  status?: UserStatusFilter;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

export class ReportsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sort?: string = 'createdAt';

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsEnum(ReportStatusFilter)
  status?: ReportStatusFilter;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

// ─── Response Types ─────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BulkOperationResult {
  id: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface BulkOperationResponse {
  processed: number;
  failed: number;
  results: BulkOperationResult[];
}
