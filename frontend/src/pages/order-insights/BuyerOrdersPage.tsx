'use client';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatus } from '@/features/order-insights/types/orderInsights.types';
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
    if (field === 'status') return;
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

  const handleLimitChange = (limit: number) => {
    methods.setValue('limit', limit, { shouldValidate: false, shouldDirty: false });
    methods.setValue('page', 1, { shouldValidate: false, shouldDirty: false });
    patch({ limit, page: 1 });
  };

  if (error) {
    return (
      <div className="space-y-6 p-2 lg:p-4">
        <div className="text-center py-12">
          <p className="text-destructive">{t('buyer.orders.error.loadFailed', 'Unable to load orders.')}</p>
          <button
            className="mt-4 text-sm text-primary underline"
            onClick={() => refetch()}
          >
            {t('common.actions.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-2 lg:p-4">
      <div
        className="flex shrink-0 items-center justify-between rounded-2xl px-7 py-5 text-white"
        style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
          boxShadow: '0 8px 20px rgba(124, 58, 237, 0.2)',
        }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ letterSpacing: '0.8px' }}>
            &#x1F4E6; {t('buyer.orders.kpi.title', 'ORDER INSIGHTS')}
          </p>
          <h1 className="mt-1 text-xl font-bold">
            {t('buyer.orders.title', 'My Orders')}
          </h1>
          <p className="mt-1 text-sm opacity-85">
            {t('buyer.orders.subtitle', 'Track your purchases, view receipts, and manage your beauty orders.')}
          </p>
        </div>
        <button
          type="button"
          className="hidden shrink-0 rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-purple-600 shadow-sm transition-colors hover:bg-gray-50 sm:block"
        >
          &#x2193; {t('buyer.orders.exportCsv', 'Export CSV')}
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-1 shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div>
              <p className="text-[13px] font-medium text-gray-500">
                {t('buyer.orders.kpi.totalOrders', 'Total Orders')}
              </p>
              <p className="mt-1 text-[22px] font-bold text-gray-900">
                {data.meta.total}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: '#f3f0ff', color: '#7c3aed' }}>
              <span className="text-lg">&#x1F4E6;</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div>
              <p className="text-[13px] font-medium text-gray-500">
                {t('buyer.orders.kpi.totalSpent', 'Total Spent')}
              </p>
              <p className="mt-1 text-[22px] font-bold text-gray-900">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                  data.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
                )}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: '#fce7f3', color: '#ec4899' }}>
              <span className="text-lg">&#x1F4B0;</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div>
              <p className="text-[13px] font-medium text-gray-500">
                {t('buyer.orders.kpi.inProgress', 'In Progress')}
              </p>
              <p className="mt-1 text-[22px] font-bold text-gray-900">
                {data.orders.filter(o => o.status !== OrderStatus.DELIVERED).length}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: '#dbeafe', color: '#3b82f6' }}>
              <span className="text-lg">&#x1F69A;</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div>
              <p className="text-[13px] font-medium text-gray-500">
                {t('buyer.orders.kpi.completed', 'Completed')}
              </p>
              <p className="mt-1 text-[22px] font-bold text-gray-900">
                {data.orders.filter(o => o.status === OrderStatus.DELIVERED).length}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: '#d1fae5', color: '#10b981' }}>
              <span className="text-lg">&#x2705;</span>
            </div>
          </div>
        </div>
      )}

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/80 shadow-xs">
        <CardHeader className="pb-1">
          <CardTitle className="text-base">{t('buyer.orders.recentOrders', 'Recent Orders')}</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-2 pt-0 pb-1">
          <OrderFilterBar
            methods={methods}
            onApply={handleApply}
            onReset={handleReset}
          />

          {data && data.orders.length === 0 ? (
            <EmptyOrderState />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <OrderHistoryTable
                rows={data?.orders || []}
                loading={isLoading}
                onTrack={(id) => window.location.href = `/orders/${id}`}
                onSort={handleSort}
                pagination={data?.meta ?? { page: 1, limit: 20, total: 0 }}
                onPageChange={handlePageChange}
                currentSort={methods.watch('sort')}
                currentOrder={methods.watch('order')}
              />
              {data && (
                <OrderPagination
                  meta={data.meta}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BuyerOrdersPage() {
  return <BuyerOrdersPageContent />;
}
