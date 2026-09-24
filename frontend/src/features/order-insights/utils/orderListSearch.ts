import { orderListFilterSchema } from '../schemas/orderFilters.schema';

/** The only query parameters the Order Insights list page reads. */
const LIST_PARAM_KEYS = ['status', 'from', 'to', 'page', 'limit', 'sort', 'order'] as const;

/**
 * Validates a query string stashed on the list → detail navigation so
 * "Back to Order Insights" can restore the previous filters and pagination.
 *
 * Only the known list parameters are copied, and the result is accepted only
 * when it parses with the same `orderListFilterSchema` the list page uses — a
 * crafted URL or navigation state can never inject extra keys or invalid
 * values. Anything that does not validate falls back to the plain list URL
 * (empty string), matching how the list itself would ignore the bad query.
 */
export function sanitizeListSearch(raw: unknown): string {
  if (typeof raw !== 'string' || raw === '') return '';

  const source = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
  const known = new URLSearchParams();
  for (const key of LIST_PARAM_KEYS) {
    const value = source.get(key);
    if (value !== null) known.set(key, value);
  }
  if (known.toString() === '') return '';

  const parsed = orderListFilterSchema.safeParse({
    status: known.get('status') ?? 'all',
    from: known.get('from') ?? '',
    to: known.get('to') ?? '',
    page: known.get('page') ?? 1,
    limit: known.get('limit') ?? 20,
    sort: known.get('sort') ?? 'createdAt',
    order: known.get('order') ?? 'desc',
  });
  if (!parsed.success) return '';

  // Keep the validated params verbatim so the list receives exactly what it had.
  return known.toString();
}