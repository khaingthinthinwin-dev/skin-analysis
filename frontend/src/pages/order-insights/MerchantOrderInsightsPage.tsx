import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportMerchantOrdersDialog } from '@/features/order-insights/components/ExportMerchantOrdersDialog';
import { OrderFilterBar } from '@/features/order-insights/components/OrderFilterBar';
import { MerchantEmptyOrderState } from '@/features/order-insights/components/MerchantEmptyOrderState';
import { MerchantOrderTable } from '@/features/order-insights/components/MerchantOrderTable';
import { RevenueSummaryGroup } from '@/features/order-insights/components/RevenueSummaryGroup';
import { SalesSummaryTiles } from '@/features/order-insights/components/SalesSummaryTiles';
import { OrderPagination } from '@/features/order-insights/components/OrderPagination';
import { useMerchantOrders } from '@/features/order-insights/hooks/useMerchantOrders';
import { useRevenueSummary } from '@/features/order-insights/hooks/useRevenueSummary';
import { useSalesSummary } from '@/features/order-insights/hooks/useSalesSummary';
import { useOrderListFilters } from '@/features/order-insights/hooks/useOrderListFilters';
import { useOrderQueryParams } from '@/features/order-insights/hooks/useOrderQueryParams';
import { revenuePeriodSchema, type OrderListFilterFormData } from '@/features/order-insights/schemas/orderFilters.schema';
import { getPanelErrorMessage, getServerErrorMessage, isHttpErrorStatus } from '@/features/order-insights/types/merchantOrderInsights.types';
import type { SummaryPeriod } from '@/features/order-insights/types/merchantOrderInsights.types';

const DEFAULT_FILTERS: OrderListFilterFormData = { status: 'all', from: '', to: '', page: 1, limit: 10, sort: 'createdAt', order: 'desc' };

function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 p-4 text-sm text-destructive"><span>{message}</span><Button variant="outline" size="sm" onClick={onRetry}>{t('common.actions.retry', 'Retry')}</Button></div>;
}

function MerchantOrderInsightsPageContent() {
  const { t } = useTranslation();
  const translate = (key: string, fallback?: string) => t(key, { defaultValue: fallback });
  const navigate = useNavigate();
  const { methods, filters } = useOrderListFilters(DEFAULT_FILTERS.limit);
  const { patch } = useOrderQueryParams();
  const listRef = useRef<HTMLDivElement>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [period, setPeriod] = useState<SummaryPeriod>('this_month');
  const [periodDates, setPeriodDates] = useState<{ from?: string; to?: string }>({});
  const salesQuery = useSalesSummary();
  const revenueQuery = useRevenueSummary({ period, ...periodDates });
  const ordersQuery = useMerchantOrders(filters);
  const forbiddenError = [salesQuery.error, revenueQuery.error, ordersQuery.error].find((error) => isHttpErrorStatus(error, 403));

  const resetFilters = () => { methods.reset(DEFAULT_FILTERS); patch(DEFAULT_FILTERS); };
  const applyFilters = (values: OrderListFilterFormData) => { methods.setValue('page', 1, { shouldValidate: false }); patch({ ...values, page: 1 }); };
  const changeSort = (field: 'createdAt' | 'totalAmount' | 'status') => { const order = methods.getValues('sort') === field && methods.getValues('order') === 'desc' ? 'asc' : 'desc'; methods.setValue('sort', field); methods.setValue('order', order); methods.setValue('page', 1); patch({ sort: field, order, page: 1 }); };
  const changePage = (page: number) => { methods.setValue('page', page); patch({ page }); };
  const changeLimit = (limit: number) => { methods.setValue('limit', limit); methods.setValue('page', 1); patch({ limit, page: 1 }); };
  const completedClick = () => { patch({ status: 'delivered', page: 1 }); methods.setValue('status', 'delivered'); methods.setValue('page', 1); listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const changePeriod = (nextPeriod: SummaryPeriod, from?: string, to?: string) => { setPeriod(nextPeriod); setPeriodDates({ from, to }); };
  const revenueDateError = revenueQuery.error !== null && isHttpErrorStatus(revenueQuery.error, 422) ? t('merchant.revenue.invalidPeriod', 'Select a start and end date') : undefined;
  const revenueServerError = revenueQuery.error !== null && revenueDateError === undefined ? getPanelErrorMessage(revenueQuery.error, translate, 'merchant.revenue.error.loadFailed', 'Unable to load revenue summary.') : undefined;
  const applyCustomDates = (from: string, to: string) => { if (revenuePeriodSchema.safeParse({ period: 'custom', from, to }).success) { setPeriod('custom'); setPeriodDates({ from, to }); } };

  if (forbiddenError) return <div className="p-4"><Alert variant="destructive"><AlertTitle>{t('merchant.orders.error.forbidden', 'Access denied')}</AlertTitle><AlertDescription>{getServerErrorMessage(forbiddenError) || t('merchant.orders.error.notApproved', 'Your merchant account is not approved')}</AlertDescription></Alert></div>;

  return <main className="flex min-w-0 flex-col gap-4 p-2 lg:p-4"><header><h1 className="m-0 text-[22px] font-bold text-gray-900">{t('merchant.orders.title', 'Order Insights')}</h1><p className="mt-1 text-[12.5px] text-gray-500">{t('merchant.orders.scopeNote', 'Showing orders for your shop only.')}</p></header>
    {salesQuery.isLoading ? <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3"><Skeleton className="h-[72px] rounded-xl" /><Skeleton className="h-[72px] rounded-xl" /><Skeleton className="h-[72px] rounded-xl" /></div> : salesQuery.error ? <PanelError message={getPanelErrorMessage(salesQuery.error, translate, 'merchant.orders.error.loadFailed', 'Unable to load sales summary.')} onRetry={() => void salesQuery.refetch()} /> : <SalesSummaryTiles data={salesQuery.data} onCompletedClick={completedClick} />}
    {revenueServerError && <PanelError message={revenueServerError} onRetry={() => void revenueQuery.refetch()} />}
    <RevenueSummaryGroup data={revenueQuery.data} loading={revenueQuery.isLoading} period={period} from={periodDates.from} to={periodDates.to} onPeriodChange={changePeriod} onApply={applyCustomDates} error={revenueDateError} />
    <div ref={listRef}><Card className="border-border/80 shadow-xs"><CardContent className="p-3 sm:p-4"><OrderFilterBar methods={methods} onApply={applyFilters} onReset={resetFilters} onExport={() => setIsExportDialogOpen(true)} exportLabel="Export CSV" />{ordersQuery.error ? <PanelError message={getPanelErrorMessage(ordersQuery.error, translate, 'merchant.orders.error.loadFailed', 'Unable to load orders.')} onRetry={() => void ordersQuery.refetch()} /> : ordersQuery.data?.meta.total === 0 ? <MerchantEmptyOrderState onReset={resetFilters} /> : <MerchantOrderTable rows={ordersQuery.data?.orders ?? []} loading={ordersQuery.isLoading} onView={(id) => navigate(`/merchant/orders/${id}`)} onSort={changeSort} currentSort={filters.sort} currentOrder={filters.order} />}</CardContent></Card></div>
    {ordersQuery.data && ordersQuery.data.meta.total > 0 && <OrderPagination meta={ordersQuery.data.meta} onPageChange={changePage} onLimitChange={changeLimit} sizes={[10, 20, 50]} />}
    {isExportDialogOpen && <ExportMerchantOrdersDialog filters={filters} total={ordersQuery.data?.meta.total ?? 0} onClose={() => setIsExportDialogOpen(false)} />}
  </main>;
}

export default function MerchantOrderInsightsPage() { return <MerchantOrderInsightsPageContent />; }