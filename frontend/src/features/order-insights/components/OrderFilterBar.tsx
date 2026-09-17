'use client';

import { Controller, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, RotateCcw, Search } from 'lucide-react';
import { type OrderListFilterFormData } from '../schemas/orderFilters.schema';

interface OrderFilterBarProps {
  methods: UseFormReturn<OrderListFilterFormData, unknown, OrderListFilterFormData>;
  onApply: (values: OrderListFilterFormData) => void;
  onReset: () => void;
}

export function OrderFilterBar({ methods, onApply, onReset }: OrderFilterBarProps) {
  const { t } = useTranslation();
  const { control, formState: { errors } } = methods;

  const handleSubmit = (values: OrderListFilterFormData) => {
    onApply(values);
  };

  return (
    <form onSubmit={methods.handleSubmit(handleSubmit)} className="flex w-full flex-col gap-4 rounded-lg border bg-muted/30 p-4 sm:grid sm:items-end sm:gap-3 sm:grid-cols-[130px_minmax(110px,1fr)_minmax(110px,1fr)_auto_auto] md:grid-cols-[130px_minmax(150px,220px)_minmax(150px,220px)_1fr_auto_auto]">
      <div className="flex-1 min-w-0 sm:w-[130px]">
        <label htmlFor="filter-status" className="block text-sm font-medium text-muted-foreground mb-1">
          {t('orders.filter.status', 'Status')}
        </label>
<Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? 'all'} onValueChange={field.onChange}>
              <SelectTrigger id="filter-status" className="w-full">
                <SelectValue placeholder={t('orders.filter.status', 'Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.filters.all', 'All')}</SelectItem>
                {['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'].map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`common.status.${status}`, status.replaceAll('_', ' '))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
         />
        {errors.status && (
          <p className="text-sm text-destructive mt-1" role="alert">{errors.status.message}</p>
        )}
      </div>

      <div className="flex w-full flex-col items-end gap-2 sm:contents">
        <div className="w-full sm:min-w-0">
          <span className="mb-1 block text-sm font-medium text-muted-foreground">
            {t('orders.filter.dateRange.label', 'Order date')}
          </span>
          <label htmlFor="filter-from" className="sr-only">
            {t('orders.filter.dateRange.from', 'From')}
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Controller
              name="from"
              control={control}
              render={({ field }) => (
                <Input
                  id="filter-from"
                  type="date"
                  value={field.value ? field.value.split('T')[0] : ''}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      methods.handleSubmit(handleSubmit)();
                    }
                  }}
                  className="pl-10"
                  placeholder={t('orders.filter.dateRange.from', 'From')}
                />
              )}
            />
          </div>
          {errors.from && (
            <p className="text-sm text-destructive mt-1" role="alert">{errors.from.message}</p>
          )}
        </div>

        <div className="w-full sm:min-w-0">
          <label htmlFor="filter-to" className="sr-only">
            {t('orders.filter.dateRange.to', 'To')}
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Controller
              name="to"
              control={control}
              render={({ field }) => (
                <Input
                  id="filter-to"
                  type="date"
                  value={field.value ? field.value.split('T')[0] : ''}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      methods.handleSubmit(handleSubmit)();
                    }
                  }}
                  className="pl-10"
                  placeholder={t('orders.filter.dateRange.to', 'To')}
                />
              )}
            />
          </div>
          {errors.to && (
            <p className="text-sm text-destructive mt-1" role="alert">{errors.to.message}</p>
          )}
        </div>
      </div>

      {/* Spacer: absorbs leftover width at md+ so From/To never stretch and Search/Clear stay pinned to the right */}
      <div className="hidden md:block" aria-hidden="true" />

      <div className="flex flex-col items-end gap-1 sm:contents">
        <Button type="submit" aria-label={t('common.filters.search', 'Search')} className="h-10 w-full shrink-0 gap-2 sm:w-auto">
          <Search className="h-4 w-4" aria-hidden="true" />
          {t('common.filters.search', 'Search')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onReset} className="h-10 w-full gap-2 sm:w-auto">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t('common.filters.clear', 'Clear')}
        </Button>
      </div>
    </form>
  );
}
