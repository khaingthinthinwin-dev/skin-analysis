import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'ComparePriceGreaterThanPrice', async: false })
export class ComparePriceGreaterThanPriceValidator implements ValidatorConstraintInterface {
  validate(compareAtPrice: number, args: ValidationArguments): boolean {
    if (compareAtPrice === undefined || compareAtPrice === null) {
      return true;
    }
    const price = (args.object as Record<string, unknown>).price;
    if (price === undefined || price === null) {
      return true;
    }
    return compareAtPrice > (price as number);
  }

  defaultMessage(): string {
    return 'Compare price must be greater than selling price';
  }
}
