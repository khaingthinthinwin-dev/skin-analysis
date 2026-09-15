import { IsBoolean } from 'class-validator';

export class ToggleAdActiveDto {
  @IsBoolean()
  isActive: boolean;
}
