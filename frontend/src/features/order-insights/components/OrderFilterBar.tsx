'use client';

import { Controller, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
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
    <form onSubmit={methods.handleSubmit(handleSubmit)} className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex-1 sm:w-64">
        <label htmlFor="filter-status" className="block text-sm font-medium text-muted-foreground mb-1">
          {t('orders.filter.status')}
        </label>
<Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? 'all'} onValueChange={field.onChange}>
              <SelectTrigger id="filter-status">
                <SelectValue placeholder={t('orders.filter.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.filters.all')}</SelectItem>
                {['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'].map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`common.status.${status}`)}
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

      <div className="flex-1 sm:w-96 flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="filter-from" className="block text-sm font-medium text-muted-foreground mb-1">
            {t('orders.filter.dateRange.from')}
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
                  className="pl-10"
                  placeholder={t('orders.filter.dateRange.from')}
                />
              )}
            />
          </div>
          {errors.from && (
            <p className="text-sm text-destructive mt-1" role="alert">{errors.from.message}</p>
          )}
        </div>

        <div className="flex-1">
          <label htmlFor="filter-to" className="block text-sm font-medium text-muted-foreground mb-1">
            {t('orders.filter.dateRange.to')}
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
                  className="pl-10"
                  placeholder={t('orders.filter.dateRange.to')}
                />
              )}
            />
          </div>
          {errors.to && (
            <p className="text-sm text-destructive mt-1" role="alert">{errors.to.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-end gap-2">
        <Button type="submit" className="w-full sm:w-auto">
          {t('common.filters.apply')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onReset} className="w-full sm:w-auto">
          {t('common.filters.clear')}
        </Button>
      </div>
    </form>
  );
}