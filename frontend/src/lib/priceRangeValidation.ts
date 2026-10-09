const PRICE_ERROR_MIN_MAX = 'Minimum price cannot be greater than maximum price.'
const PRICE_ERROR_NEGATIVE = 'Price cannot be negative.'

export function validatePriceRange(minValue?: string, maxValue?: string): string | null {
  const min = minValue?.trim() ? Number(minValue) : undefined
  const max = maxValue?.trim() ? Number(maxValue) : undefined

  if ([min, max].some((value) => value !== undefined && Number.isNaN(value))) {
    return PRICE_ERROR_NEGATIVE
  }
  if ((min !== undefined && min < 0) || (max !== undefined && max < 0)) {
    return PRICE_ERROR_NEGATIVE
  }
  if (min !== undefined && max !== undefined && min > max) {
    return PRICE_ERROR_MIN_MAX
  }
  return null
}
