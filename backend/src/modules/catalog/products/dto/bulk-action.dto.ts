import { IsArray, IsString, IsNotEmpty, IsIn } from 'class-validator';

export class BulkActionDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ message: 'At least one product ID is required' })
  ids: string[];

  @IsString()
  @IsNotEmpty()
  @IsIn(['activate', 'deactivate'], {
    message: 'Action must be activate or deactivate',
  })
  action: 'activate' | 'deactivate';
}
