import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router';
import {
  adminOrderFilterSchema,
  type AdminOrderFilterFormData,
} from '../schemas/orderFilters.schema';

const DEFAULT_FILTERS: AdminOrderFilterFormData = {
  status: 'all',
  from: '',
  to: '',
  page: 1,
  limit: 10,
  sort: 'createdAt',
  order: 'desc',
  merchantId: undefined,
  shopId: undefined,
  shopSearch: '',
  paymentStatus: 'all',
  orderSearch: '',
};

function parseFilters(params: URLSearchParams): AdminOrderFilterFormData {
  const parsed = adminOrderFilterSchema.safeParse({
    status: params.get('status') ?? 'all',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    page: params.get('page') ?? 1,
    limit: params.get('limit') ?? 10,
    sort: params.get('sort') ?? 'createdAt',
    order: params.get('order') ?? 'desc',
    merchantId: params.get('merchantId') ?? undefined,
    shopId: params.get('shopId') ?? undefined,
    shopSearch: params.get('shopSearch') ?? '',
    paymentStatus: params.get('paymentStatus') ?? 'all',
    orderSearch: params.get('orderSearch') ?? '',
  });
  return parsed.success ? { ...DEFAULT_FILTERS, ...parsed.data } : DEFAULT_FILTERS;
}

export function useAdminOrderFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(queryString)),
    [queryString],
  );
  const methods = useForm<AdminOrderFilterFormData>({
    resolver: zodResolver(adminOrderFilterSchema) as Resolver<AdminOrderFilterFormData>,
    mode: 'onChange',
    defaultValues: filters,
  });

  useEffect(() => {
    methods.reset(filters, { keepDefaultValues: true });
  }, [filters, methods]);

  function patch(values: Partial<AdminOrderFilterFormData>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === '' || value === 'all') next.delete(key);
      else next.set(key, String(value));
    }
    setSearchParams(next, { replace: true });
  }

  return { methods, filters, patch };
}
