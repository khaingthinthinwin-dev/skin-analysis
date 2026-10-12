'use client';

import { useEffect, useRef } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { Search, RotateCcw, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminActiveFilterChips, type AdminFilterChipKey } from './AdminActiveFilterChips';
import { AdminShopCombobox } from './AdminShopCombobox';
import type { AdminMerchantOption } from '../types/adminOrderInsights.types';
import type { AdminOrderFilterFormData } from '../schemas/orderFilters.schema';

interface AdminOrderFilterBarProps {
  methods: UseFormReturn<AdminOrderFilterFormData>;
  onApply: (values: AdminOrderFilterFormData) => void;
  onReset: () => void;
  onShopSearchChange: (value: string) => void;
  onStatusChange: (status: AdminOrderFilterFormData['status']) => void;
  onPaymentStatusChange: (status: AdminOrderFilterFormData['paymentStatus']) => void;
  onExport: () => void;
  /** Removes one applied filter group without disturbing the others. */
  onClearFilter: (key: AdminFilterChipKey) => void;
  /** Debounced partial order-number lookup, matching the merchant filter bar. */
  onOrderSearchChange: (value: string) => void;
  exportDisabled?: boolean;
  exporting?: boolean;
}

export function AdminOrderFilterBar({ methods, onApply, onReset, onShopSearchChange, onStatusChange, onPaymentStatusChange, onExport, onClearFilter, onOrderSearchChange, exportDisabled = false, exporting = false }: AdminOrderFilterBarProps) {
  const { t } = useTranslation();
  const shopSearch = methods.watch('shopSearch') ?? '';
  const orderSearch = methods.watch('orderSearch') ?? '';
  const onShopSearchChangeRef = useRef(onShopSearchChange);
  const onOrderSearchChangeRef = useRef(onOrderSearchChange);
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
    onOrderSearchChangeRef.current = onOrderSearchChange;
  }, [onOrderSearchChange]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onShopSearchChangeRef.current(shopSearch.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [shopSearch]);

  // Filtering as the admin types means a pasted order number from the table's
  // copy action narrows the list immediately, with no Search press.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onOrderSearchChangeRef.current(orderSearch.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [orderSearch]);

  /** Free text keeps the substring shop filter; picking a suggestion pins the exact shop. */
  const handleShopTextChange = (value: string) => {
    methods.setValue('shopSearch', value, { shouldDirty: true, shouldValidate: true });
    methods.setValue('merchantId', undefined, { shouldDirty: true, shouldValidate: true });
    methods.setValue('shopId', undefined, { shouldDirty: true, shouldValidate: true });
  };

  const handleOrderNumberChange = (value: string) => {
    methods.setValue('orderSearch', value, { shouldDirty: true, shouldValidate: true });
  };

  const handleShopSelect = (option: AdminMerchantOption) => {
    methods.setValue('shopSearch', option.shopName, { shouldDirty: true, shouldValidate: true });
    methods.setValue('merchantId', option.id, { shouldDirty: true, shouldValidate: true });
    onApply({ ...methods.getValues(), shopSearch: option.shopName, merchantId: option.id });
  };

  return (
    <form
      onSubmit={methods.handleSubmit(onApply)}
      className="mb-4 grid w-full gap-3 rounded-lg border bg-muted/30 p-4 dark:border-[#29252f] dark:bg-[#111014] sm:grid-cols-2 xl:grid-cols-[minmax(160px,0.65fr)_minmax(150px,1fr)_140px_130px_minmax(135px,1fr)_minmax(135px,1fr)_auto_auto_auto] xl:items-end"
    >
      <div className="min-w-0">
        <label htmlFor="admin-order-number" className="mb-1 block text-sm font-medium text-muted-foreground">
          {t('merchant.orders.filter.orderNumber', 'Order #')}
        </label>
        <Input
          id="admin-order-number"
          value={orderSearch}
          onChange={(event) => handleOrderNumberChange(event.target.value)}
          placeholder={t('merchant.orders.filter.orderNumberPlaceholder', 'Search order no')}
          maxLength={100}
          className="font-mono"
        />
      </div>

      <div className="relative min-w-0">
        <label htmlFor="admin-order-merchant" className="mb-1 block text-sm font-medium text-muted-foreground">
          {t('admin.orders.filter.shop', 'Shop / Merchant')}
        </label>
        <AdminShopCombobox
          id="admin-order-merchant"
          value={shopSearch}
          onValueChange={handleShopTextChange}
          onSelect={handleShopSelect}
          placeholder={t('admin.orders.filter.shopPlaceholder', 'Search shop')}
        />
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

      <Button
        type="submit"
        aria-label={t('common.filters.search', 'Search')}
        title={t('common.filters.search', 'Search')}
        disabled={invalidDateRange}
        className="gap-2"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        aria-label={t('common.filters.clear', 'Clear')}
        title={t('common.filters.clear', 'Clear')}
        onClick={onReset}
        className="gap-2"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button type="button" variant="outline" onClick={onExport} disabled={exportDisabled} className="gap-2">
        {exporting ? t('merchant.orders.exporting', 'Exporting...') : t('common.actions.export', 'Export')}
      </Button>
{invalidDateRange && <p className="text-sm text-destructive xl:col-span-full" role="alert">{t('orders.filter.dateRange.invalid', 'End date must be on or after start date.')}</p>}
      <div className="xl:col-span-full">
        <AdminActiveFilterChips filters={methods.watch()} onClear={onClearFilter} onClearAll={onReset} />
      </div>
    </form>
  );
}
