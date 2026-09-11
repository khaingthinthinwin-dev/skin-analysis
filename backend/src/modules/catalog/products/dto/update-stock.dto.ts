import { IsInt, Min } from 'class-validator';

export class UpdateStockDto {
  @IsInt({ message: 'Stock quantity must be a whole number' })
  @Min(0, { message: 'Stock quantity must be 0 or greater' })
  stockQuantity: number;
}
