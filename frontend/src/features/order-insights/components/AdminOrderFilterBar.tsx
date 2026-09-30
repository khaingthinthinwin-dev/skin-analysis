'use client';

import { useEffect, useState } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { Search, RotateCcw, Calendar, Store } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AdminOrderFilterFormData } from '../schemas/orderFilters.schema';
import { searchAdminMerchants } from '../services/adminOrderService';

interface AdminOrderFilterBarProps {
  methods: UseFormReturn<AdminOrderFilterFormData>;
  onApply: (values: AdminOrderFilterFormData) => void;
  onReset: () => void;
}

export function AdminOrderFilterBar({ methods, onApply, onReset }: AdminOrderFilterBarProps) {
  const { t } = useTranslation();
  const [merchantSearch, setMerchantSearch] = useState('');
  const [selectedMerchantName, setSelectedMerchantName] = useState('');
  const [showMerchantResults, setShowMerchantResults] = useState(false);
  const selectedMerchantId = methods.watch('merchantId');
  const selectedShopId = methods.watch('shopId');
  const from = methods.watch('from');
  const to = methods.watch('to');
  const invalidDateRange = Boolean(from && to && from > to);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowMerchantResults(merchantSearch.trim().length > 0), 250);
    return () => window.clearTimeout(timeout);
  }, [merchantSearch]);

  const merchantsQuery = useQuery({
    queryKey: ['adminOrderMerchantOptions', merchantSearch],
    queryFn: () => searchAdminMerchants(merchantSearch),
    enabled: showMerchantResults,
    staleTime: 30_000,
  });

  const selectMerchant = (merchantId: string, shopName: string) => {
    methods.setValue('merchantId', merchantId, { shouldDirty: true, shouldValidate: true });
    methods.setValue('shopId', undefined, { shouldDirty: true, shouldValidate: true });
    setSelectedMerchantName(shopName);
    setMerchantSearch('');
    setShowMerchantResults(false);
  };

  return (
    <form
      onSubmit={methods.handleSubmit(onApply)}
      className="mb-4 grid w-full gap-3 rounded-lg border bg-muted/30 p-4 dark:border-[#29252f] dark:bg-[#111014] sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_150px_minmax(150px,1fr)_minmax(150px,1fr)_auto_auto] xl:items-end"
    >
      <div className="relative min-w-0">
        <label htmlFor="admin-order-merchant" className="mb-1 block text-sm font-medium text-muted-foreground">
          {t('admin.orders.filter.shop', 'Shop / Merchant')}
        </label>
        <div className="relative">
          <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="admin-order-merchant"
            value={merchantSearch || selectedMerchantName}
            placeholder={t('admin.orders.filter.shopPlaceholder', 'Search shop or merchant')}
            className="pl-9"
            onFocus={() => setShowMerchantResults(merchantSearch.trim().length > 0)}
            onChange={(event) => {
              const value = event.target.value;
              setMerchantSearch(value);
              setSelectedMerchantName('');
              if (!value) {
                methods.setValue('merchantId', undefined, { shouldDirty: true, shouldValidate: true });
                methods.setValue('shopId', undefined, { shouldDirty: true, shouldValidate: true });
              }
            }}
            onBlur={() => window.setTimeout(() => setShowMerchantResults(false), 150)}
            autoComplete="off"
          />
        </div>
        {showMerchantResults && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md" role="listbox" aria-label={t('admin.orders.filter.shop', 'Shop / Merchant')}>
            {merchantsQuery.isLoading ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">{t('common.loading', 'Loading...')}</p>
            ) : merchantsQuery.data?.length ? merchantsQuery.data.map((merchant) => (
              <button
                key={merchant.id}
                type="button"
                role="option"
                aria-selected={selectedMerchantId === merchant.id}
                className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectMerchant(merchant.id, merchant.shopName)}
              >
                {merchant.shopName}
              </button>
            )) : (
              <p className="px-3 py-2 text-sm text-muted-foreground">{t('admin.orders.filter.noMerchants', 'No shops or merchants found.')}</p>
            )}
          </div>
        )}
        {(selectedMerchantId || selectedShopId) && (
          <p className="mt-1 truncate text-xs text-muted-foreground" title={selectedMerchantId || selectedShopId}>
            {selectedMerchantName || selectedMerchantId || selectedShopId}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="admin-order-status" className="mb-1 block text-sm font-medium text-muted-foreground">
          {t('orders.filter.status', 'Status')}
        </label>
        <Controller
          name="status"
          control={methods.control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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
        <label htmlFor="admin-order-from" className="mb-1 block text-sm font-medium text-muted-foreground">
          {t('orders.filter.dateRange.from', 'From')}
        </label>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id="admin-order-from" type="date" className="pl-9" value={from?.slice(0, 10) ?? ''} onChange={(event) => methods.setValue('from', event.target.value, { shouldValidate: true })} />
        </div>
      </div>

      <div>
        <label htmlFor="admin-order-to" className="mb-1 block text-sm font-medium text-muted-foreground">
          {t('orders.filter.dateRange.to', 'To')}
        </label>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id="admin-order-to" type="date" className="pl-9" value={to?.slice(0, 10) ?? ''} onChange={(event) => methods.setValue('to', event.target.value, { shouldValidate: true })} />
        </div>
      </div>

      <Button type="submit" disabled={invalidDateRange} className="gap-2">
        <Search className="h-4 w-4" aria-hidden="true" />{t('common.filters.search', 'Search')}
      </Button>
      <Button type="button" variant="outline" onClick={onReset} className="gap-2">
        <RotateCcw className="h-4 w-4" aria-hidden="true" />{t('common.filters.clear', 'Clear')}
      </Button>
      {invalidDateRange && <p className="text-sm text-destructive xl:col-span-full" role="alert">{t('orders.filter.dateRange.invalid', 'End date must be on or after start date.')}</p>}
    </form>
  );
}
