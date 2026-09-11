import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AdminBulkRejectDto {
  @IsArray({ message: 'ad_ids must be an array' })
  @ArrayMinSize(1, { message: 'At least one ad must be selected' })
  @ArrayMaxSize(50, { message: 'Maximum 50 ads per bulk operation' })
  @IsUUID('4', { each: true, message: 'Invalid ad ID format' })
  ad_ids: string[];

  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required for bulk reject' })
  @MaxLength(1000, {
    message: 'Rejection reason must not exceed 1000 characters',
  })
  rejection_reason: string;
}
