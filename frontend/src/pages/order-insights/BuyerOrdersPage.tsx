'use client';
import { useTranslation } from 'react-i18next';
import { PackageCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBuyerOrders } from '@/features/order-insights/hooks/useBuyerOrders';
import { OrderFilterBar } from '@/features/order-insights/components/OrderFilterBar';
import { OrderHistoryTable } from '@/features/order-insights/components/OrderHistoryTable';
import { OrderPagination } from '@/features/order-insights/components/OrderPagination';
import { EmptyOrderState } from '@/features/order-insights/components/EmptyOrderState';
import { useOrderListFilters } from '@/features/order-insights/hooks/useOrderListFilters';
import { useOrderQueryParams } from '@/features/order-insights/hooks/useOrderQueryParams';
import type { OrderListFilterFormData } from '@/features/order-insights/schemas/orderFilters.schema';

function BuyerOrdersPageContent() {
  const { t } = useTranslation();
  const { methods, filters } = useOrderListFilters();
  const { patch } = useOrderQueryParams();

  const { data, isLoading, error, refetch } = useBuyerOrders({
    status: filters.status === 'all' ? undefined : filters.status,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: filters.page,
    limit: filters.limit,
    sort: filters.sort,
    order: filters.order,
  });

  const handleApply = (values: OrderListFilterFormData) => {
    patch({ ...values, page: 1 });
    methods.setValue('page', 1, { shouldValidate: false, shouldDirty: false });
  };

  const handleReset = () => {
    methods.reset({
      status: 'all',
      from: '',
      to: '',
      page: 1,
      limit: 20,
      sort: 'createdAt',
      order: 'desc',
    });
    patch({ status: 'all', from: '', to: '', page: 1, limit: 20, sort: 'createdAt', order: 'desc' });
  };

  const handleSort = (field: 'createdAt' | 'totalAmount' | 'status') => {
    const currentSort = methods.watch('sort');
    const currentOrder = methods.watch('order');
    const newOrder = currentSort === field && currentOrder === 'desc' ? 'asc' : 'desc';
    methods.setValue('sort', field, { shouldValidate: false, shouldDirty: false });
    methods.setValue('order', newOrder, { shouldValidate: false, shouldDirty: false });
    methods.setValue('page', 1, { shouldValidate: false, shouldDirty: false });
    patch({ sort: field, order: newOrder, page: 1 });
  };

  const handlePageChange = (page: number) => {
    methods.setValue('page', page, { shouldValidate: false, shouldDirty: false });
    patch({ page });
  };

  const handleView = (orderId: string) => {
    // No-op for now - no detail page route yet
    console.log('View order:', orderId);
  };

  if (error) {
    return (
      <div className="space-y-6 p-2 lg:p-4">
        <div className="text-center py-12">
          <p className="text-destructive">{t('buyer.orders.error.loadFailed')}</p>
          <button
            className="mt-4 text-sm text-primary underline"
            onClick={() => refetch()}
          >
            {t('common.actions.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 lg:p-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <PackageCheck className="h-6 w-6 text-purple-600" aria-hidden="true" />
          {t('buyer.orders.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('buyer.orders.subtitle')}
        </p>
      </div>

      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('buyer.orders.recentOrders')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <OrderFilterBar
            methods={methods}
            onApply={handleApply}
            onReset={handleReset}
          />

          {data && data.orders.length === 0 ? (
            <EmptyOrderState />
          ) : (
            <>
              <OrderHistoryTable
                rows={data?.orders || []}
                loading={isLoading}
                onView={handleView}
                onTrack={(id) => window.location.href = `/orders/${id}/tracking`}
                onSort={handleSort}
                pagination={data?.meta ?? { page: 1, limit: 20, total: 0 }}
                onPageChange={handlePageChange}
                currentSort={methods.watch('sort')}
                currentOrder={methods.watch('order')}
              />
              {data && (
                <OrderPagination meta={data.meta} onPageChange={handlePageChange} />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BuyerOrdersPage() {
  return <BuyerOrdersPageContent />;
}