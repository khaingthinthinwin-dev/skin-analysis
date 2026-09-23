/**
 * Format a price value in USD currency format for the admin advertisement module.
 * Example: 15000 → "$15,000"
 */
export function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '$0'
  return `$${Number(value).toLocaleString('en-US')}`
}