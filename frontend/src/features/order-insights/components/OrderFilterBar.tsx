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
  onStatusChange?: (status: OrderListFilterFormData['status']) => void;
  showPaymentStatusFilter?: boolean;
  onPaymentStatusChange?: (status: NonNullable<OrderListFilterFormData['paymentStatus']>) => void;
  onReset: () => void;
  onExport: () => void;
  exportDisabled?: boolean;
  exportLabel?: string;
}

export function OrderFilterBar({ methods, onApply, onStatusChange, showPaymentStatusFilter = false, onPaymentStatusChange, onReset, onExport, exportDisabled = false, exportLabel }: OrderFilterBarProps) {
  const { t } = useTranslation();
  const { control, formState: { errors } } = methods;
  const from = methods.watch('from');
  const to = methods.watch('to');
  const isDateRangeInvalid = Boolean(from && to && from > to);

  const handleSubmit = (values: OrderListFilterFormData) => {
    onApply(values);
  };

  return (
    <form onSubmit={methods.handleSubmit(handleSubmit)} className={`mb-[14px] flex w-full flex-col gap-4 rounded-lg border bg-muted/30 px-4 py-[14px] dark:border-[#29252f] dark:bg-[#111014] oidark:border-outline-variant oidark:bg-surface-container sm:grid sm:items-end sm:gap-3 ${showPaymentStatusFilter ? 'sm:grid-cols-2 md:grid-cols-[120px_130px_minmax(130px,1fr)_minmax(130px,1fr)_auto_auto_auto_auto] xl:grid-cols-[130px_140px_minmax(150px,220px)_minmax(150px,220px)_1fr_auto_auto_auto]' : 'sm:grid-cols-[130px_minmax(110px,1fr)_minmax(110px,1fr)_auto_auto_auto] md:grid-cols-[130px_minmax(150px,220px)_minmax(150px,220px)_1fr_auto_auto_auto]'}`}>
      <div className="flex-1 min-w-0 pb-5 sm:w-[130px]">
        <label htmlFor="filter-status" className="block text-sm font-medium text-muted-foreground dark:text-slate-300 oidark:text-slate-300 mb-1">
          {t('orders.filter.status', 'Status')}
        </label>
<Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? 'all'} onValueChange={(status) => {
              field.onChange(status);
              onStatusChange?.(status as OrderListFilterFormData['status']);
            }}>
              <SelectTrigger id="filter-status" className="h-10 w-full dark:border-[#393440] dark:bg-[#0b0a0d] dark:text-slate-100">
                <SelectValue placeholder={t('orders.filter.status', 'Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.filters.all', 'All')}</SelectItem>
                {['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'].map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`common.status.${status}`, status.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()))}
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

      {showPaymentStatusFilter && (
        <div className="min-w-0 pb-5 sm:w-[130px]">
          <label htmlFor="filter-payment-status" className="mb-1 block text-sm font-medium text-muted-foreground dark:text-slate-300 oidark:text-slate-300">
            {t('orders.table.payment', 'Payment')}
          </label>
          <Controller
            name="paymentStatus"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? 'all'} onValueChange={(status) => {
                field.onChange(status);
                onPaymentStatusChange?.(status as NonNullable<OrderListFilterFormData['paymentStatus']>);
              }}>
                <SelectTrigger id="filter-payment-status" className="h-10 w-full dark:border-[#393440] dark:bg-[#0b0a0d] dark:text-slate-100">
                  <SelectValue placeholder={t('orders.table.payment', 'Payment')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.filters.all', 'All')}</SelectItem>
                  <SelectItem value="pending">{t('common.payment.pending', 'Pending')}</SelectItem>
                  <SelectItem value="completed">{t('common.payment.completed', 'Completed')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      <div className="flex w-full flex-col items-end gap-2 sm:contents">
        <div className="relative w-full pb-5 sm:min-w-0">
          <span className="mb-1 block text-sm font-medium text-muted-foreground dark:text-slate-300 oidark:text-slate-300">
            {t('orders.filter.dateRange.label', 'Order date')}
          </span>
          <label htmlFor="filter-from" className="sr-only">
            {t('orders.filter.dateRange.from', 'From')}
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-slate-300 oidark:text-slate-300" aria-hidden="true" />
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
                  className="h-10 pl-10 dark:border-[#393440] dark:bg-[#0b0a0d] dark:text-slate-100 dark:[color-scheme:dark] oidark:border-outline-variant oidark:bg-surface-container-lowest oidark:text-foreground oidark:[color-scheme:dark]"
                  placeholder={t('orders.filter.dateRange.from', 'From')}
                />
              )}
            />
          </div>
          {errors.from && <p className="absolute bottom-0 left-0 text-sm text-red-500" role="alert">{errors.from.message}</p>}
        </div>

        <div className="relative w-full pb-5 sm:min-w-0">
          <label htmlFor="filter-to" className="sr-only">
            {t('orders.filter.dateRange.to', 'To')}
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-slate-300 oidark:text-slate-300" aria-hidden="true" />
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
                  className="h-10 pl-10 dark:border-[#393440] dark:bg-[#0b0a0d] dark:text-slate-100 dark:[color-scheme:dark] oidark:border-outline-variant oidark:bg-surface-container-lowest oidark:text-foreground oidark:[color-scheme:dark]"
                  placeholder={t('orders.filter.dateRange.to', 'To')}
                />
              )}
            />
          </div>
          {errors.to && <p className="absolute bottom-0 left-0 text-sm text-red-500" role="alert">{errors.to.message}</p>}
        </div>
      </div>

      {/* Spacer: absorbs leftover width at md+ so From/To never stretch and Search/Clear stay pinned to the right */}
      <div className="hidden md:block" aria-hidden="true" />

      <div className="grid w-full grid-cols-2 gap-2 sm:contents">
        <span className="w-full sm:w-auto" title={isDateRangeInvalid ? 'Please select a valid date range.' : undefined}>
          <Button
            type="submit"
            aria-label={t('common.filters.search', 'Search')}
            disabled={isDateRangeInvalid}
            className="h-10 w-full shrink-0 gap-2 sm:-translate-y-4 sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span>{t('common.filters.search', 'Search')}</span>
          </Button>
        </span>
        <Button type="button" variant="outline" size="sm" onClick={onReset} className="h-10 w-full gap-2 sm:-translate-y-4 sm:w-auto">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          <span>{t('common.filters.clear', 'Clear')}</span>
        </Button>
        <span className="col-span-2 w-full sm:col-span-1 sm:w-auto" title={isDateRangeInvalid ? 'Please select a valid date range.' : undefined}>
          <Button
            type="button"
            onClick={onExport}
            disabled={exportDisabled || isDateRangeInvalid}
            className="h-10 w-full shrink-0 rounded-[7px] border border-[#e5e7eb] bg-white px-[18px] text-[13px] font-semibold text-[#374151] shadow-none hover:border-[#7c3aed] hover:bg-white hover:text-[#7c3aed] dark:border-[#393440] dark:bg-[#211a29] dark:text-slate-100 dark:hover:border-violet-400 dark:hover:bg-[#211a29] dark:hover:text-violet-300 oidark:border-outline-variant oidark:bg-surface-container-high oidark:text-on-surface-variant oidark:hover:border-primary oidark:hover:bg-surface-container-high oidark:hover:text-primary sm:-translate-y-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            &#x2193; {exportLabel ?? t('buyer.orders.exportCsv', 'Export CSV')}
          </Button>
        </span>
      </div>
    </form>
  );
}
