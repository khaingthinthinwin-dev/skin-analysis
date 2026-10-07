import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminFilterChipKey } from '@/features/order-insights/components/AdminActiveFilterChips';
import { AdminOrderFilterBar } from '@/features/order-insights/components/AdminOrderFilterBar';
import { AdminOrderKpiTiles } from '@/features/order-insights/components/AdminOrderKpiTiles';
import { ExportAdminOrdersDialog } from '@/features/order-insights/components/ExportAdminOrdersDialog';
import { AdminOrderTable } from '@/features/order-insights/components/AdminOrderTable';
import { OrderPagination } from '@/features/order-insights/components/OrderPagination';
import { useAdminOrderFilters } from '@/features/order-insights/hooks/useAdminOrderFilters';
import { useAdminOrders } from '@/features/order-insights/hooks/useAdminOrders';
import type { AdminOrderFilterFormData } from '@/features/order-insights/schemas/orderFilters.schema';
import type { OrderSortField } from '@/features/order-insights/types/orderInsights.types';

const DEFAULT_FILTERS: AdminOrderFilterFormData = {
  status: 'all', paymentStatus: 'all', shopSearch: '', orderSearch: '', from: '', to: '', page: 1, limit: 10, sort: 'createdAt', order: 'desc',
};

export default function AdminOrdersPage() {
  const { methods, filters, patch } = useAdminOrderFilters();
  const ordersQuery = useAdminOrders(filters);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const resetFilters = () => {
    methods.reset(DEFAULT_FILTERS);
    patch(DEFAULT_FILTERS);
  };
  const applyFilters = (values: AdminOrderFilterFormData) => {
    methods.setValue('page', 1, { shouldValidate: false });
    patch({ ...values, page: 1 });
  };
  const changeStatus = (status: AdminOrderFilterFormData['status']) => {
    methods.setValue('page', 1, { shouldValidate: false });
    patch({ status, page: 1 });
  };
  const changePaymentStatus = (paymentStatus: AdminOrderFilterFormData['paymentStatus']) => {
    methods.setValue('page', 1, { shouldValidate: false });
    patch({ paymentStatus, page: 1 });
  };
  const changePage = (page: number) => {
    methods.setValue('page', page, { shouldValidate: false });
    patch({ page });
  };
  const changeLimit = (limit: number) => {
    methods.setValue('limit', limit, { shouldValidate: false });
    methods.setValue('page', 1, { shouldValidate: false });
    patch({ limit, page: 1 });
  };
  const changeSort = (field: OrderSortField) => {
    const order = methods.getValues('sort') === field && methods.getValues('order') === 'desc' ? 'asc' : 'desc';
    methods.setValue('sort', field);
    methods.setValue('order', order);
    methods.setValue('page', 1);
    patch({ sort: field, order, page: 1 });
  };
  const changeShopSearch = (shopSearch: string) => {
    // No-op guard mirrors changeOrderSearch: without it the mount-time debounce
    // fires with '', patches `?page=1`, and the resulting URL-driven reset wipes
    // characters the admin is still typing into another filter field.
    if ((filters.shopSearch ?? '').trim() === shopSearch) return;
    methods.setValue('page', 1, { shouldValidate: false });
    patch({
      shopSearch,
      merchantId: methods.getValues('merchantId'),
      shopId: methods.getValues('shopId'),
      page: 1,
    });
  };
  const changeOrderSearch = (orderSearch: string) => {
    if ((filters.orderSearch ?? '').trim() === orderSearch) return;
    methods.setValue('page', 1, { shouldValidate: false });
    patch({ orderSearch, page: 1 });
  };
  /** Drops one filter group and returns to page 1, leaving the rest of the filter set alone. */
  const clearFilter = (key: AdminFilterChipKey) => {
    methods.setValue('page', 1, { shouldValidate: false });
    if (key === 'orderNumber') {
      methods.setValue('orderSearch', '', { shouldValidate: false });
      patch({ orderSearch: '', page: 1 });
      return;
    }
    if (key === 'shop') {
      methods.setValue('shopSearch', '', { shouldValidate: false });
      methods.setValue('merchantId', undefined, { shouldValidate: false });
      methods.setValue('shopId', undefined, { shouldValidate: false });
      patch({ shopSearch: '', merchantId: undefined, shopId: undefined, page: 1 });
      return;
    }
    if (key === 'status') {
      methods.setValue('status', 'all', { shouldValidate: false });
      patch({ status: 'all', page: 1 });
      return;
    }
    if (key === 'paymentStatus') {
      methods.setValue('paymentStatus', 'all', { shouldValidate: false });
      patch({ paymentStatus: 'all', page: 1 });
      return;
    }
    methods.setValue('from', '', { shouldValidate: false });
    methods.setValue('to', '', { shouldValidate: false });
    patch({ from: '', to: '', page: 1 });
  };
  return (
    <main className="flex min-w-0 flex-col gap-4 p-2 lg:p-4">
      <header>
        <h1 className="text-[22px] font-bold text-foreground">All Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">View platform orders across all shops and merchants.</p>
      </header>

      <AdminOrderKpiTiles
        meta={ordersQuery.data?.meta}
        summary={ordersQuery.data?.summary}
        loading={ordersQuery.isLoading}
      />

      <Card className="border-border/80 shadow-xs oidark:border-outline-variant oidark:bg-surface-container-low">
        <CardContent className="p-3 sm:p-4">
          <AdminOrderFilterBar
            methods={methods}
            onApply={applyFilters}
            onReset={resetFilters}
            onShopSearchChange={changeShopSearch}
            onOrderSearchChange={changeOrderSearch}
            onStatusChange={changeStatus}
            onPaymentStatusChange={changePaymentStatus}
            onClearFilter={clearFilter}
            onExport={() => setIsExportDialogOpen(true)}
            exportDisabled={ordersQuery.isLoading || !ordersQuery.data?.meta.total}
          />

          {ordersQuery.error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load orders</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>Please try again.</span>
                <Button variant="outline" size="sm" onClick={() => void ordersQuery.refetch()}>Retry</Button>
              </AlertDescription>
            </Alert>
          ) : ordersQuery.data?.meta.total === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-muted-foreground">No orders match the current filters.</p>
              <Button variant="outline" onClick={resetFilters}>Clear Filters</Button>
            </div>
          ) : (
            <>
              {ordersQuery.data && <p className="mb-3 text-sm text-muted-foreground">{ordersQuery.data.meta.total} orders match the current filters.</p>}
              <AdminOrderTable
                rows={ordersQuery.data?.orders ?? []}
                loading={ordersQuery.isLoading}
                onSort={changeSort}
                currentSort={filters.sort}
                currentOrder={filters.order}
              />
            </>
          )}
        </CardContent>
      </Card>

      {ordersQuery.data && ordersQuery.data.meta.total > 0 && (
        <OrderPagination meta={ordersQuery.data.meta} onPageChange={changePage} onLimitChange={changeLimit} sizes={[10, 20, 50]} />
      )}
      {isExportDialogOpen && <ExportAdminOrdersDialog filters={filters} total={ordersQuery.data?.meta.total ?? 0} onClose={() => setIsExportDialogOpen(false)} />}
    </main>
  );
}
