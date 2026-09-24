import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { orderListFilterSchema, type OrderListFilterFormData } from '../schemas/orderFilters.schema';

export const DEFAULT_ORDER_LIST_FILTERS: OrderListFilterFormData = {
  status: 'all',
  from: '',
  to: '',
  page: 1,
  limit: 20,
  sort: 'createdAt',
  order: 'desc',
};

export function parseOrderListFilters(searchParams: URLSearchParams, defaultLimit: number = DEFAULT_ORDER_LIST_FILTERS.limit): OrderListFilterFormData {
  const parsed = orderListFilterSchema.safeParse({
    status: searchParams.get('status') ?? DEFAULT_ORDER_LIST_FILTERS.status,
    from: searchParams.get('from') ?? DEFAULT_ORDER_LIST_FILTERS.from,
    to: searchParams.get('to') ?? DEFAULT_ORDER_LIST_FILTERS.to,
    page: searchParams.get('page') ?? DEFAULT_ORDER_LIST_FILTERS.page,
    limit: searchParams.get('limit') ?? defaultLimit,
    sort: searchParams.get('sort') ?? DEFAULT_ORDER_LIST_FILTERS.sort,
    order: searchParams.get('order') ?? DEFAULT_ORDER_LIST_FILTERS.order,
  });

  if (!parsed.success) return { ...DEFAULT_ORDER_LIST_FILTERS, limit: defaultLimit };

  return {
    ...DEFAULT_ORDER_LIST_FILTERS,
    ...parsed.data,
    from: parsed.data.from ?? '',
    to: parsed.data.to ?? '',
  };
}

export function useOrderQueryParams(defaultLimit?: number) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const filters = useMemo(
    () => parseOrderListFilters(new URLSearchParams(queryString), defaultLimit),
    [queryString, defaultLimit],
  );

  function patch(values: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === '' || value === 'all') next.delete(key);
      else next.set(key, String(value));
    }
    setSearchParams(next, { replace: true });
  }

  return { searchParams, patch, filters };
}