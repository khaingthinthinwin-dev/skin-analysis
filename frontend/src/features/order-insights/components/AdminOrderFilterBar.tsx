'use client';

import { useEffect, useRef } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { Search, RotateCcw, Calendar, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AdminOrderFilterFormData } from '../schemas/orderFilters.schema';

interface AdminOrderFilterBarProps {
  methods: UseFormReturn<AdminOrderFilterFormData>;
  onApply: (values: AdminOrderFilterFormData) => void;
  onReset: () => void;
  onShopSearchChange: (value: string) => void;
  onStatusChange: (status: AdminOrderFilterFormData['status']) => void;
  onPaymentStatusChange: (status: AdminOrderFilterFormData['paymentStatus']) => void;
  onExport: () => void;
  exportDisabled?: boolean;
  exporting?: boolean;
}

export function AdminOrderFilterBar({ methods, onApply, onReset, onShopSearchChange, onStatusChange, onPaymentStatusChange, onExport, exportDisabled = false, exporting = false }: AdminOrderFilterBarProps) {
  const { t } = useTranslation();
  const shopSearch = methods.watch('shopSearch') ?? '';
  const onShopSearchChangeRef = useRef(onShopSearchChange);
  const fromDateInput = useRef<HTMLInputElement | null>(null);
  const toDateInput = useRef<HTMLInputElement | null>(null);
  const from = methods.watch('from');
  const to = methods.watch('to');
  const invalidDateRange = Boolean(from && to && from > to);

  const openDatePicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        input.focus();
      }
    } else {
      input.focus();
    }
  };

  useEffect(() => {
    onShopSearchChangeRef.current = onShopSearchChange;
  }, [onShopSearchChange]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onShopSearchChangeRef.current(shopSearch.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [shopSearch]);

  return (
    <form
      onSubmit={methods.handleSubmit(onApply)}
      className="mb-4 grid w-full gap-3 rounded-lg border bg-muted/30 p-4 dark:border-[#29252f] dark:bg-[#111014] sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_140px_130px_minmax(135px,1fr)_minmax(135px,1fr)_auto_auto_auto] xl:items-end"
    >
      <div className="relative min-w-0">
        <label htmlFor="admin-order-merchant" className="mb-1 block text-sm font-medium text-muted-foreground">
          {t('admin.orders.filter.shop', 'Shop / Merchant')}
        </label>
        <div className="relative">
          <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="admin-order-merchant"
            value={shopSearch}
            placeholder={t('admin.orders.filter.shopPlaceholder', 'Search shop')}
            className="pl-9"
            onChange={(event) => {
              const value = event.target.value;
              methods.setValue('shopSearch', value, { shouldDirty: true, shouldValidate: true });
              methods.setValue('merchantId', undefined, { shouldDirty: true, shouldValidate: true });
              methods.setValue('shopId', undefined, { shouldDirty: true, shouldValidate: true });
            }}
          />
        </div>
      </div>

      <div>
        <label htmlFor="admin-order-status" className="mb-1 block text-sm font-medium text-muted-foreground">
          {t('orders.filter.status', 'Status')}
        </label>
        <Controller
          name="status"
          control={methods.control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={(status) => {
              field.onChange(status);
              onStatusChange(status as AdminOrderFilterFormData['status']);
            }}>
              <SelectTrigger id="admin-order-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.filters.all', 'All')}</SelectItem>
                {['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'].map((status) => (
                  <SelectItem key={status} value={status}>{t(`common.status.${status}`, status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()))}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <label htmlFor="admin-order-payment" className="mb-1 block text-sm font-medium text-muted-foreground">
          {t('orders.table.payment', 'Payment')}
        </label>
        <Controller
          name="paymentStatus"
          control={methods.control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={(status) => {
              field.onChange(status);
              onPaymentStatusChange(status as AdminOrderFilterFormData['paymentStatus']);
            }}>
              <SelectTrigger id="admin-order-payment"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.filters.all', 'All')}</SelectItem>
                <SelectItem value="pending">{t('common.payment.pending', 'Pending')}</SelectItem>
                <SelectItem value="completed">{t('common.payment.completed', 'Completed')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <label htmlFor="admin-order-from" className="mb-1 block text-sm font-medium text-muted-foreground">
          {t('orders.filter.dateRange.from', 'From')}
        </label>
        <div className="relative">
          <Controller
            name="from"
            control={methods.control}
            render={({ field }) => (
              <>
                <button type="button" aria-label="Choose start date" onClick={() => openDatePicker(fromDateInput.current)} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                </button>
                <Input
                  id="admin-order-from"
                  type="date"
                  className="pl-9"
                  name={field.name}
                  ref={(element) => {
                    field.ref(element);
                    fromDateInput.current = element;
                  }}
                  onBlur={field.onBlur}
                  value={field.value?.slice(0, 10) ?? ''}
                  onChange={field.onChange}
                  onClick={(event) => openDatePicker(event.currentTarget)}
                />
              </>
            )}
          />
        </div>
      </div>

      <div>
        <label htmlFor="admin-order-to" className="mb-1 block text-sm font-medium text-muted-foreground">
          {t('orders.filter.dateRange.to', 'To')}
        </label>
        <div className="relative">
          <Controller
            name="to"
            control={methods.control}
            render={({ field }) => (
              <>
                <button type="button" aria-label="Choose end date" onClick={() => openDatePicker(toDateInput.current)} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                </button>
                <Input
                  id="admin-order-to"
                  type="date"
                  className="pl-9"
                  name={field.name}
                  ref={(element) => {
                    field.ref(element);
                    toDateInput.current = element;
                  }}
                  onBlur={field.onBlur}
                  value={field.value?.slice(0, 10) ?? ''}
                  onChange={field.onChange}
                  onClick={(event) => openDatePicker(event.currentTarget)}
                />
              </>
            )}
          />
        </div>
      </div>

      <Button type="submit" disabled={invalidDateRange} className="gap-2">
        <Search className="h-4 w-4" aria-hidden="true" />{t('common.filters.search', 'Search')}
      </Button>
      <Button type="button" variant="outline" onClick={onReset} className="gap-2">
        <RotateCcw className="h-4 w-4" aria-hidden="true" />{t('common.filters.clear', 'Clear')}
      </Button>
      <Button type="button" variant="outline" onClick={onExport} disabled={exportDisabled} className="gap-2">
        {exporting ? t('merchant.orders.exporting', 'Exporting...') : t('common.actions.export', 'Export')}
      </Button>
      {invalidDateRange && <p className="text-sm text-destructive xl:col-span-full" role="alert">{t('orders.filter.dateRange.invalid', 'End date must be on or after start date.')}</p>}
    </form>
  );
}
