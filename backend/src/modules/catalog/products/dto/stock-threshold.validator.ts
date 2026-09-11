import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({
  name: 'StockQuantityNotLessThanThreshold',
  async: false,
})
export class StockQuantityNotLessThanThresholdValidator implements ValidatorConstraintInterface {
  validate(stockQuantity: number, args: ValidationArguments): boolean {
    if (stockQuantity === undefined || stockQuantity === null) {
      return true;
    }
    const lowStockThreshold = (args.object as Record<string, unknown>)
      .lowStockThreshold;
    if (lowStockThreshold === undefined || lowStockThreshold === null) {
      return true;
    }
    return stockQuantity >= (lowStockThreshold as number);
  }

  defaultMessage(): string {
    return 'Stock quantity must not be less than low stock threshold';
  }
}
