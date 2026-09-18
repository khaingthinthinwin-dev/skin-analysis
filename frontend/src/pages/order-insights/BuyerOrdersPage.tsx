'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OrderStatus } from '@/features/order-insights/types/orderInsights.types';
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

function BuyerOrdersPageContent() {
  const { t } = useTranslation();
  const { methods, filters } = useOrderListFilters();
  const { patch } = useOrderQueryParams();
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExportCsv = async () => {
    if (exportFrom && exportTo && exportTo < exportFrom) {
      toast.error('End date must be on or after the start date');
      return;
    }

    setIsExporting(true);
    try {
      const orders: OrderListRowDto[] = [];
      let page = 1;
      let total = 0;

      do {
        const response = await orderService.getBuyerOrders({
          status: 'all',
          from: exportFrom ? new Date(`${exportFrom}T00:00:00`).toISOString() : '',
          to: exportTo ? new Date(`${exportTo}T23:59:59.999`).toISOString() : '',
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
      const rangeLabel = exportFrom || exportTo ? `-${exportFrom || 'all'}-to-${exportTo || 'all'}` : '';
      exportOrdersCsv(orders, `my-orders${rangeLabel}-${today}.csv`);
      toast.success(`Exported ${orders.length} orders`);
      setIsExportDialogOpen(false);
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
      className="flex flex-col gap-4 overflow-hidden p-2 lg:p-4"
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
                {t('buyer.orders.kpi.totalOrders', 'Total Orders')}
              </p>
              <p className="mt-[6px] text-[22px] font-bold tracking-[-0.3px] text-white">
                {data.meta.total}
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
                {t('buyer.orders.kpi.totalSpent', 'Total Spent')}
              </p>
              <p className="mt-[6px] text-[22px] font-bold tracking-[-0.3px] text-white">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                  data.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
                )}
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
                {t('buyer.orders.kpi.inProgress', 'In Progress')}
              </p>
              <p className="mt-[6px] text-[22px] font-bold tracking-[-0.3px] text-white">
                {data.orders.filter(o => o.status !== OrderStatus.DELIVERED).length}
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
                {t('buyer.orders.kpi.completed', 'Completed')}
              </p>
              <p className="mt-[6px] text-[22px] font-bold tracking-[-0.3px] text-white">
                {data.orders.filter(o => o.status === OrderStatus.DELIVERED).length}
              </p>
            </div>
            <div className="shrink-0 text-[28px] leading-none" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.45))' }}>
              &#x1F3C6;
            </div>
          </div>
        </div>
      )}

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/80 shadow-xs">
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-0 overflow-hidden p-4 pb-3">
          <div className="shrink-0">
            <OrderFilterBar
              methods={methods}
              onApply={handleApply}
              onReset={handleReset}
              onExport={() => setIsExportDialogOpen(true)}
            />
          </div>

          {data && data.orders.length === 0 ? (
            <EmptyOrderState />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
                <div className="shrink-0">
                  <OrderPagination
                    meta={data.meta}
                    onPageChange={handlePageChange}
                    onLimitChange={handleLimitChange}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Orders</DialogTitle>
            <DialogDescription>
              Select an optional order date range for the CSV export.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="export-from" className="text-sm font-medium text-muted-foreground">
                Start date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="export-from"
                  type="date"
                  value={exportFrom}
                  onChange={(event) => setExportFrom(event.target.value)}
                  className="pl-10"
                  max={exportTo || undefined}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="export-to" className="text-sm font-medium text-muted-foreground">
                End date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="export-to"
                  type="date"
                  value={exportTo}
                  onChange={(event) => setExportTo(event.target.value)}
                  className="pl-10"
                  min={exportFrom || undefined}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsExportDialogOpen(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleExportCsv} disabled={isExporting} className="gap-2">
              <Download className="h-4 w-4" aria-hidden="true" />
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
