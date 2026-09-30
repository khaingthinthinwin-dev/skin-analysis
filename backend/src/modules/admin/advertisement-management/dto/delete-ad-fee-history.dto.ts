import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class DeleteAdFeeHistoryDto {
  @IsArray({ message: 'history_ids must be an array' })
  @ArrayMinSize(1, {
    message: 'At least one fee history record must be selected',
  })
  @ArrayMaxSize(50, { message: 'Maximum 50 records per bulk operation' })
  @IsUUID('4', { each: true, message: 'Invalid fee history ID format' })
  history_ids: string[];
}
