/**
 * Format a price value for the admin advertisement module.
 * Example: 15000 → "15,000 KS"
 */
export function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '0 KS'
  return `${Number(value).toLocaleString('en-US')} KS`
}