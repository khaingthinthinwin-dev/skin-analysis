import { IsArray, IsString, IsNotEmpty, IsIn, IsUUID } from 'class-validator';

export class BulkActionDto {
  @IsArray()
  @IsUUID('4', {
    each: true,
    message: 'Each product ID must be a valid UUID v4',
  })
  @IsNotEmpty({ message: 'At least one product ID is required' })
  ids: string[];

  @IsString()
  @IsNotEmpty()
  @IsIn(['activate', 'deactivate'], {
    message: 'Action must be activate or deactivate',
  })
  action: 'activate' | 'deactivate';
}
