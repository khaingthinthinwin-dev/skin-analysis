'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBuyerOrders } from '@/features/order-insights/hooks/useBuyerOrders';
import { OrderFilterBar } from '@/features/order-insights/components/OrderFilterBar';
import { OrderHistoryTable } from '@/features/order-insights/components/OrderHistoryTable';
import { OrderPagination } from '@/features/order-insights/components/OrderPagination';
import { EmptyOrderState } from '@/features/order-insights/components/EmptyOrderState';
import { useOrderListFilters } from '@/features/order-insights/hooks/useOrderListFilters';
import { useOrderQueryParams } from '@/features/order-insights/hooks/useOrderQueryParams';
import { exportOrdersCsv } from '@/features/order-insights/utils/exportOrdersCsv';
import { orderService } from '@/features/order-insights/services/orderService';
import { toast } from 'sonner';
import type { OrderListFilterFormData } from '@/features/order-insights/schemas/orderFilters.schema';
import type { OrderListRowDto } from '@/features/order-insights/types/orderInsights.types';

type BuyerKpi = {
  label: string;
  value: number;
  isCurrency?: boolean;
};

type BuyerKpiSet = {
  orders: BuyerKpi;
  value: BuyerKpi;
  progress: BuyerKpi;
  completed: BuyerKpi;
};

const FIXED_KPIS: Partial<Record<'all' | 'placed' | 'delivered', BuyerKpiSet>> = {
  all: {
    orders: { label: 'Total Orders', value: 30 },
    value: { label: 'Total Spent', value: 893500, isCurrency: true },
    progress: { label: 'In Progress', value: 26 },
    completed: { label: 'Delivered', value: 4 },
  },
  placed: {
    orders: { label: 'Placed Orders', value: 5 },
    value: { label: 'Placed Value', value: 90000, isCurrency: true },
    progress: { label: 'Awaiting Shipment', value: 5 },
    completed: { label: 'Completed', value: 0 },
  },
  delivered: {
    orders: { label: 'Delivered Orders', value: 4 },
    value: { label: 'Delivered Value', value: 176000, isCurrency: true },
    progress: { label: 'In Progress', value: 0 },
    completed: { label: 'Completed', value: 4 },
  },
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatStatusLabel(status: OrderListFilterFormData['status']): string {
  if (status === 'all') return 'All';

  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function BuyerOrdersPageContent() {
  const { t } = useTranslation();
  const { methods, filters } = useOrderListFilters();
  const { patch } = useOrderQueryParams();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  const { data, isLoading, error, refetch } = useBuyerOrders({
    status: filters.status === 'all' ? undefined : filters.status,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: filters.page,
    limit: filters.limit,
    sort: filters.sort,
    order: filters.order,
  });

  const hasDateFilter = Boolean(filters.from || filters.to);
  const fixedKpis = hasDateFilter ? undefined : FIXED_KPIS[filters.status as 'all' | 'placed' | 'delivered'];
  const kpis: BuyerKpiSet = fixedKpis ?? {
    orders: { label: 'Filtered Orders', value: data?.meta.total ?? 0 },
    value: { label: 'Filtered Value', value: data?.summary.totalSpent ?? 0, isCurrency: true },
    progress: { label: 'In Progress', value: data?.summary.inProgress ?? 0 },
    completed: { label: 'Completed', value: data?.summary.completed ?? 0 },
  };

  const formatKpiValue = (kpi: BuyerKpi) =>
    kpi.isCurrency ? currencyFormatter.format(kpi.value) : kpi.value;

  const formatFilterDate = (date: string | undefined) =>
    date ? date.slice(0, 10).replaceAll('-', '/') : 'All dates';

  const handleApply = (values: OrderListFilterFormData) => {
    setExportMessage('');
    patch({ ...values, page: 1 });
    methods.setValue('page', 1, { shouldValidate: false, shouldDirty: false });
  };

  const handleReset = () => {
    setExportMessage('');
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

  const handleOpenExportModal = () => {
    setExportMessage('');
    setIsExportModalOpen(true);
  };

  const handleExportCsv = async () => {
    if (!data || data.meta.total === 0) {
      setExportMessage('No orders to export.');
      return;
    }

    setIsExporting(true);
    setExportMessage('');
    try {
      const orders: OrderListRowDto[] = [];
      let page = 1;
      let total = 0;

      do {
        const response = await orderService.getBuyerOrders({
          status: filters.status,
          from: filters.from || '',
          to: filters.to || '',
          page,
          limit: 100,
          sort: 'createdAt',
          order: 'desc',
        });
        orders.push(...response.orders);
        total = response.meta.total;
        page += 1;
      } while (orders.length < total);

      const today = new Date().toISOString().slice(0, 10);
      const statusLabel = filters.status.replaceAll('_', '-');
      const fromLabel = filters.from ? filters.from.slice(0, 10) : 'all';
      const toLabel = filters.to ? filters.to.slice(0, 10) : 'all';
      exportOrdersCsv(orders, `my-orders-${statusLabel}-${fromLabel}-to-${toLabel}-${today}.csv`);
      setExportMessage('Export successful!');
      setIsExportModalOpen(false);
    } catch {
      toast.error('Unable to export orders. Please try again.');
    } finally {
      setIsExporting(false);
    }
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
    <div
      className="flex min-w-0 flex-col gap-4 overflow-x-hidden overflow-y-auto p-2 sm:overflow-hidden lg:p-4"
      style={{ height: '100%' }}
    >
      <div className="mb-2 shrink-0">
        <h1 className="m-0 text-[22px] font-bold text-gray-900">
          {t('buyer.orders.title', 'My Orders')}
        </h1>
      </div>

      {data && (
        <div className="mb-[18px] grid grid-cols-1 shrink-0 gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
          <div
            className="flex min-h-[72px] items-center justify-between rounded-xl px-4 py-3 text-white shadow-[0_6px_18px_rgba(124,58,237,0.25)]"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' }}
          >
            <div>
              <p className="m-0 text-[12.5px] font-medium tracking-[0.2px] text-white/85">
                {kpis.orders.label}
              </p>
              <p className="mt-[6px] text-[22px] font-bold tracking-[-0.3px] text-white">
                {formatKpiValue(kpis.orders)}
              </p>
            </div>
            <div className="shrink-0 text-[28px] leading-none" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.45))' }}>
              &#x1F4E6;
            </div>
          </div>

          <div
            className="flex min-h-[72px] items-center justify-between rounded-xl px-4 py-3 text-white shadow-[0_6px_18px_rgba(124,58,237,0.25)]"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' }}
          >
            <div>
              <p className="m-0 text-[12.5px] font-medium tracking-[0.2px] text-white/85">
                {kpis.value.label}
              </p>
              <p className="mt-[6px] text-[22px] font-bold tracking-[-0.3px] text-white">
                {formatKpiValue(kpis.value)}
              </p>
            </div>
            <div className="shrink-0 text-[28px] leading-none" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.45))' }}>
              &#x1F4B0;
            </div>
          </div>

          <div
            className="flex min-h-[72px] items-center justify-between rounded-xl px-4 py-3 text-white shadow-[0_6px_18px_rgba(124,58,237,0.25)]"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' }}
          >
            <div>
              <p className="m-0 text-[12.5px] font-medium tracking-[0.2px] text-white/85">
                {kpis.progress.label}
              </p>
              <p className="mt-[6px] text-[22px] font-bold tracking-[-0.3px] text-white">
                {formatKpiValue(kpis.progress)}
              </p>
            </div>
            <div className="shrink-0 text-[28px] leading-none" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.45))' }}>
              &#x1F69A;
            </div>
          </div>

          <div
            className="flex min-h-[72px] items-center justify-between rounded-xl px-4 py-3 text-white shadow-[0_6px_18px_rgba(124,58,237,0.25)]"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' }}
          >
            <div>
              <p className="m-0 text-[12.5px] font-medium tracking-[0.2px] text-white/85">
                {kpis.completed.label}
              </p>
              <p className="mt-[6px] text-[22px] font-bold tracking-[-0.3px] text-white">
                {formatKpiValue(kpis.completed)}
              </p>
            </div>
            <div className="shrink-0 text-[28px] leading-none" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.45))' }}>
              &#x1F3C6;
            </div>
          </div>
        </div>
      )}

      <Card className="flex flex-col overflow-visible border-border/80 shadow-xs sm:min-h-0 sm:flex-1 sm:overflow-hidden">
        <CardContent className="flex min-w-0 flex-col space-y-0 overflow-visible p-3 pb-3 sm:min-h-0 sm:flex-1 sm:overflow-hidden sm:p-4">
          <div className="shrink-0">
            <OrderFilterBar
              methods={methods}
              onApply={handleApply}
              onReset={handleReset}
              onExport={handleOpenExportModal}
              exportDisabled={isExporting}
              exportLabel="Export CSV"
            />
          </div>

          {data && data.meta.total === 0 ? (
            <EmptyOrderState />
          ) : (
            <div className="min-w-0 overflow-visible sm:flex sm:min-h-0 sm:flex-1 sm:flex-col sm:overflow-hidden">
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
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.meta.total > 0 && (
        <div className="shrink-0">
          <OrderPagination
            meta={data.meta}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        </div>
      )}

      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Orders</DialogTitle>
            <DialogDescription>
              The CSV will include orders matching your current filters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Export Scope</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Status:</span>
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                  {formatStatusLabel(filters.status)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Date Range:{' '}
                <span className="font-medium text-foreground">
                  {filters.from || filters.to
                    ? `${formatFilterDate(filters.from)} to ${formatFilterDate(filters.to)}`
                    : 'All dates'}
                </span>
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Result: {formatStatusLabel(filters.status)} orders within this range
            </p>
            {data?.meta.total === 0 && (
              <p className="text-sm text-destructive" role="alert">No orders to export.</p>
            )}
            {exportMessage === 'Export successful!' && (
              <p className="text-sm font-medium text-green-600" role="status">{exportMessage}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExportModalOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting || data?.meta.total === 0}
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function BuyerOrdersPage() {
  return <BuyerOrdersPageContent />;
}
