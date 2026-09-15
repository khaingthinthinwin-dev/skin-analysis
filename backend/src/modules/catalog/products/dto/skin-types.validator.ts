import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

const VALID_SKIN_TYPES = ['dry', 'oily', 'combination', 'sensitive', 'normal'];

@ValidatorConstraint({ name: 'ValidSkinTypes', async: false })
export class ValidSkinTypesValidator implements ValidatorConstraintInterface {
  validate(skinTypes: unknown, _args: ValidationArguments): boolean {
    if (!Array.isArray(skinTypes)) {
      return false;
    }
    return skinTypes.every(
      (type) => typeof type === 'string' && VALID_SKIN_TYPES.includes(type),
    );
  }

  defaultMessage(_args: ValidationArguments): string {
    return `skinTypes must be one of: ${VALID_SKIN_TYPES.join(', ')}`;
  }
}
