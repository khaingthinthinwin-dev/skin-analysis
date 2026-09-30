import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AdminOrderFilterBar } from '@/features/order-insights/components/AdminOrderFilterBar';
import { AdminOrderTable } from '@/features/order-insights/components/AdminOrderTable';
import { OrderPagination } from '@/features/order-insights/components/OrderPagination';
import { useAdminOrderFilters } from '@/features/order-insights/hooks/useAdminOrderFilters';
import { useAdminOrders } from '@/features/order-insights/hooks/useAdminOrders';
import type { AdminOrderFilterFormData } from '@/features/order-insights/schemas/orderFilters.schema';
import type { OrderSortField } from '@/features/order-insights/types/orderInsights.types';

const DEFAULT_FILTERS: AdminOrderFilterFormData = {
  status: 'all', from: '', to: '', page: 1, limit: 20, sort: 'createdAt', order: 'desc',
};

export default function AdminOrdersPage() {
  const { methods, filters, patch } = useAdminOrderFilters();
  const ordersQuery = useAdminOrders(filters);

  const resetFilters = () => {
    methods.reset(DEFAULT_FILTERS);
    patch(DEFAULT_FILTERS);
  };
  const applyFilters = (values: AdminOrderFilterFormData) => {
    methods.setValue('page', 1, { shouldValidate: false });
    patch({ ...values, page: 1 });
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

  return (
    <main className="flex min-w-0 flex-col gap-4 p-2 lg:p-4">
      <header>
        <h1 className="text-[22px] font-bold text-foreground">All Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">View platform orders across all shops and merchants.</p>
      </header>

      <Card className="border-border/80 shadow-xs oidark:border-outline-variant oidark:bg-surface-container-low">
        <CardContent className="p-3 sm:p-4">
          <AdminOrderFilterBar methods={methods} onApply={applyFilters} onReset={resetFilters} />

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
    </main>
  );
}
