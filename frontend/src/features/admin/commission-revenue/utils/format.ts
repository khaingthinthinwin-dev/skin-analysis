/**
 * Format a number as currency with comma separators and no decimal places.
 * Example: 12000.00 -> "12,000"
 */
export function formatCurrency(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') {
    return '0';
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    return '0';
  }
  return Math.round(num).toLocaleString('en-US');
}

/**
 * Format a rate string or number without unnecessary trailing zeroes.
 * Example: "10.00" -> "10%", "10.50" -> "10.5%"
 */
export function formatRate(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') {
    return '0%';
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    return '0%';
  }
  return `${num}%`;
}
