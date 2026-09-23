/** Reads a status code as a readable, title-cased label (e.g. "out_for_delivery" -> "Out For Delivery"). */
export function formatStatusLabel(status: string): string {
  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}