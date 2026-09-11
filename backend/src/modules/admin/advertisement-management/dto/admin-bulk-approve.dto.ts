import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class AdminBulkApproveDto {
  @IsArray({ message: 'ad_ids must be an array' })
  @ArrayMinSize(1, { message: 'At least one ad must be selected' })
  @ArrayMaxSize(50, { message: 'Maximum 50 ads per bulk operation' })
  @IsUUID('4', { each: true, message: 'Invalid ad ID format' })
  ad_ids: string[];
}
