/**
 * Format a price value in MMK currency format.
 * Example: 15000 → "15,000Ks"
 */
export function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '0Ks'
  return `${Number(value).toLocaleString('en-US')}Ks`
}
