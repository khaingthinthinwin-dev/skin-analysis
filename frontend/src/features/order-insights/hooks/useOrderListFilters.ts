import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderListFilterSchema, type OrderListFilterFormData } from '../schemas/orderFilters.schema';
import { useOrderQueryParams } from './useOrderQueryParams';

export function useOrderListFilters() {
  const { filters } = useOrderQueryParams();
  const methods = useForm<OrderListFilterFormData>({
    resolver: zodResolver(orderListFilterSchema) as Resolver<OrderListFilterFormData>,
    mode: 'onChange',
    defaultValues: filters,
  });

  useEffect(() => {
    methods.reset(filters, { keepDefaultValues: true });
  }, [filters, methods]);

  return { methods, filters };
}