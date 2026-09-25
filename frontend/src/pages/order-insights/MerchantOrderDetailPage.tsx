import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CreditCard,
  FileText,
  Info,
  MapPin,
  Package,
  PackageSearch,
  StickyNote,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CopyButton } from '@/features/order-insights/components/CopyButton';
import { DeliveryProgress } from '@/features/order-insights/components/DeliveryProgress';
import { PaymentBadge } from '@/features/order-insights/components/PaymentBadge';
import { StatusBadge } from '@/features/order-insights/components/StatusBadge';
import { CustomerInformationCard } from '@/features/order-insights/components/CustomerInformationCard';
import { MerchantInvoiceDialog } from '@/features/order-insights/components/MerchantInvoiceDialog';
import { StatusTransitionControl } from '@/features/order-insights/components/StatusTransitionControl';
import { useMerchantOrderDetail } from '@/features/order-insights/hooks/useMerchantOrderDetail';
import { useMerchantOrderTracking } from '@/features/order-insights/hooks/useMerchantOrderTracking';
import { useRevenueSummary } from '@/features/order-insights/hooks/useRevenueSummary';
import { useUpdateOrderStatus } from '@/features/order-insights/hooks/useUpdateOrderStatus';
import { OrderStatus, type OrderShippingAddress } from '@/features/order-insights/types/orderInsights.types';
import {
  formatCurrencyAmount,
  getHttpStatus,
  getPanelErrorMessage,
  getServerErrorMessage,
} from '@/features/order-insights/types/merchantOrderInsights.types';
import type { MerchantOrderDetailDto, MerchantOrderItemDto } from '@/features/order-insights/types/merchantOrderFulfillment.types';
import { computeOrderCommission } from '@/features/order-insights/utils/orderCommission';
import { sanitizeListSearch } from '@/features/order-insights/utils/orderListSearch';
import { formatStatusLabel } from '@/features/order-insights/utils/orderStatusLabel';

function formatDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(value: string, locale: string): string {
  return new Date(value).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const base = raw.replace(/\/api\/v1\/?$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

function orderReference(order: MerchantOrderDetailDto): string {
  return order.orderNumber || `#${order.id.slice(0, 8).toUpperCase()}`;
}

function addressLines(address: OrderShippingAddress): string[] {
  return [
    address.recipientName,
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(', '),
    address.country,
    address.phone,
  ].filter((line): line is string => Boolean(line));
}

function paymentMethodLabel(method: string): string {
  return method.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusCopy(status: OrderStatus): { title: string; message: string } {
  switch (status) {
    case OrderStatus.PLACED:
      return {
        title: 'Awaiting confirmation',
        message: 'Confirm this order to start processing it.',
      };
    case OrderStatus.CONFIRMED:
      return {
        title: 'Order confirmed',
        message: 'Prepare the items and hand them to the courier.',
      };
    case OrderStatus.PACKED:
      return {
        title: 'Order packed',
        message: 'Hand the package to the courier to mark it as shipped.',
      };
    case OrderStatus.SHIPPED:
      return {
        title: 'Order shipped',
        message: 'The next step is out for delivery.',
      };
    case OrderStatus.OUT_FOR_DELIVERY:
      return {
        title: 'Out for delivery',
        message: 'The courier is delivering this order today.',
      };
    case OrderStatus.DELIVERED:
      return {
        title: 'Order delivered',
        message: 'This order is complete.',
      };
    default:
      // Unknown or terminal statuses (e.g. cancelled if the backend adds one):
      // no advance action — just an accurate message.
      return {
        title: formatStatusLabel(status),
        message: 'No further actions are available for this order.',
      };
  }
}

function MerchantOrderDetailSkeleton() {
  const { t } = useTranslation();

  return (
    <div
      className="space-y-6 p-2 lg:p-4"
      aria-busy="true"
      aria-label={t('merchant.orders.detail.loading', 'Loading order')}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MerchantOrderDetailForbidden() {
  return (
    <div className="p-4">
      <Alert variant="destructive">
        <AlertTitle>Access denied</AlertTitle>
        <AlertDescription>Your merchant account is not approved</AlertDescription>
      </Alert>
    </div>
  );
}

/** Restores the list query stashed on navigation, validated with the list's own schema. */
function useBackToListHref(): string {
  const location = useLocation();
  const state = location.state as { listSearch?: unknown } | null;
  const search = sanitizeListSearch(state?.listSearch);
  return search ? `/merchant/order-insights?${search}` : '/merchant/order-insights';
}

/** One order line with a fixed 64px thumbnail that falls back to a placeholder icon. */
function OrderItemRow({ item }: { item: MerchantOrderItemDto }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = getImageUrl(item.productImage);

  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-[10px] border border-[#f3f4f6] bg-[#fafafa] p-3 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:gap-4 sm:p-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[10px] border border-[#f3f4f6] bg-[#f3f0ff]">
        {image && !imageFailed ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#7c3aed]" aria-hidden="true">
            <Package className="h-7 w-7" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-bold leading-5 text-[#111827]">{item.productName}</p>
        <p className="mt-1 text-[13px] text-[#6b7280]">Quantity: {item.quantity}</p>
        <p className="text-[13px] text-[#6b7280]">Unit price: {formatCurrencyAmount(item.unitPrice)}</p>
      </div>
      <div className="col-start-2 shrink-0 text-left sm:col-start-auto sm:text-right">
        <p className="text-[11px] uppercase text-[#9ca3af]">Line total</p>
        <p className="text-base font-bold text-[#111827]">{formatCurrencyAmount(item.totalPrice)}</p>
      </div>
    </div>
  );
}

function MerchantOrderDetailNotFound() {
  const { t } = useTranslation();
  const backHref = useBackToListHref();

  return (
    <Card className="border-border/80 shadow-xs">
      <CardContent className="py-16 px-4 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
          <PackageSearch className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          {t('orders.detail.notFound.title', 'Order not found')}
        </h3>
        <p className="mx-auto mb-6 max-w-sm text-sm text-muted-foreground">
          {t(
            'merchant.orders.detail.notFound.description',
            'This order does not belong to your shop or could not be found.',
          )}
        </p>
        <Button asChild variant="outline" className="gap-2">
          <Link to={backHref}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('merchant.orders.detail.backToOrders', 'Back to Order Insights')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function MerchantOrderDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const translate = (key: string, fallback?: string) => t(key, { defaultValue: fallback });
  const dateLocale = i18n.resolvedLanguage || i18n.language || 'en-US';

  const detailQuery = useMerchantOrderDetail(id);
  const trackingQuery = useMerchantOrderTracking(id);
  const updateMutation = useUpdateOrderStatus(id);
  const backHref = useBackToListHref();
  // The invoice is a view of the order already in memory — it opens in a dialog
  // instead of adding a section to this page, so the detail layout stays focused.
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  // The Revenue Summary endpoint is the merchant's only source for the current
  // platform commission rate — the order detail DTO carries no commission fields.
  const revenueQuery = useRevenueSummary({ period: 'this_month' });

  const advanceStatus = (nextStatus: string) => {
    updateMutation.mutate(nextStatus, {
      onSuccess: () => {
        toast.success(
          translate('merchant.orders.updateSuccess', `Order marked as ${formatStatusLabel(nextStatus)}.`),
        );
      },
      onError: (error: Error) => {
        const message =
          getServerErrorMessage(error) ||
          getPanelErrorMessage(
            error,
            translate,
            'merchant.orders.updateFailed',
            'Could not update the order status. Please try again.',
          );
        toast.error(message);
      },
    });
  };

  if (detailQuery.isLoading) {
    return <MerchantOrderDetailSkeleton />;
  }

  if (detailQuery.error) {
    if (getHttpStatus(detailQuery.error) === 403) {
      return <MerchantOrderDetailForbidden />;
    }

    if (getHttpStatus(detailQuery.error) === 404) {
      return (
        <div className="p-2 lg:p-4">
          <MerchantOrderDetailNotFound />
        </div>
      );
    }

    return (
      <div className="p-2 lg:p-4">
        <Alert variant="destructive">
          <AlertTitle>{translate('orders.detail.error.title', 'Something went wrong')}</AlertTitle>
          <AlertDescription>
            <p>
              {translate(
                'orders.detail.error.description',
                'We could not load this order. Please try again.',
              )}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => detailQuery.refetch()}>
              {translate('common.actions.retry', 'Retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!detailQuery.data) {
    return null;
  }

  const order = detailQuery.data;
  const subtotal = order.items
    .reduce((sum, item) => sum + parseFloat(item.totalPrice), 0)
    .toFixed(2);
  const address = addressLines(order.shippingAddress);
  const timeline = trackingQuery.data?.timeline ?? [];
  const deliveryStatus: OrderStatus =
    timeline.length > 0
      ? (timeline[timeline.length - 1].status as OrderStatus)
      : order.status;
  const nextStatus = order.availableTransitions[0] ?? null;
  const copy = statusCopy(order.status);
  const stepTimestamps: Partial<Record<OrderStatus, string>> = {};
  for (const entry of timeline) {
    if (entry.createdAt) stepTimestamps[entry.status as OrderStatus] = entry.createdAt;
  }
  const deliveredAt = timeline.find((entry) => entry.status === OrderStatus.DELIVERED)?.createdAt;
  const actionMessage =
    order.status === OrderStatus.DELIVERED && deliveredAt
      ? translate(
          'merchant.orders.detail.deliveredOn',
          `Completed on ${formatDate(deliveredAt, dateLocale)}, ${formatTime(deliveredAt, dateLocale)}.`,
        )
      : copy.message;
  const orderRef = orderReference(order);
  const itemCountLabel =
    order.items.length === 1
      ? translate('orders.detail.itemsCountOne', '1 item')
      : translate('orders.detail.itemsCountOther', `${order.items.length} items`);
  const discountAmount = Number(order.discountAmount);
  const hasDiscount = Number.isFinite(discountAmount) && discountAmount > 0;
  // One frontend commission formula — see utils/orderCommission.ts (BR-OI-022/028).
  const commissionRate = revenueQuery.data?.commissionRate || null;
  const commission = commissionRate ? computeOrderCommission(order.totalAmount, commissionRate) : null;
  const rateNote = translate(
    'merchant.revenue.rateNote',
    'Commission is calculated with the current platform rate; historical rate locking is pending.',
  );

  return (
    <div className="w-full max-w-full space-y-6 p-2 lg:p-4">
      <section className="flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] px-4 py-3.5 text-white shadow-[0_8px_20px_rgba(124,58,237,0.2)] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[1.2px] opacity-85">
            {translate('merchant.orders.detail.title', 'Order Details')}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold leading-tight sm:text-xl">Order {orderRef}</h1>
            <CopyButton
              value={orderRef}
              label={translate('merchant.orders.detail.copyOrderNumber', 'Copy order number')}
              className="text-white/85 hover:bg-white/15 hover:text-white focus-visible:ring-white/80"
            />
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-[13px] opacity-90">
            Placed {formatDate(order.createdAt, dateLocale)}, {formatTime(order.createdAt, dateLocale)}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {/* Deliberately the weakest action in the header: a translucent outline
              on the gradient, so it never outranks the white Back button here or
              the status advance action in the bar below. */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsInvoiceOpen(true)}
            className="w-full justify-center gap-2 rounded-lg border-white/70 bg-white/15 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-white/25 hover:text-white sm:w-auto"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            {translate('merchant.orders.detail.viewInvoice', 'View Invoice')}
          </Button>
          <Button
            asChild
            className="w-full justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-[13px] font-semibold text-[#7c3aed] hover:bg-white/90 sm:w-auto"
          >
            <Link to={backHref}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {translate('merchant.orders.detail.backToOrders', 'Back to Order Insights')}
            </Link>
          </Button>
        </div>
      </section>

      {isInvoiceOpen && <MerchantInvoiceDialog order={order} onClose={() => setIsInvoiceOpen(false)} />}

      <section className="rounded-xl border-l-4 border-[#7c3aed] bg-[#f3f0ff] px-4 py-3.5 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#7c3aed] text-lg text-white" aria-hidden="true">
              ✓
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#111827]">{copy.title}</h2>
              <p className="text-[13px] text-[#6b7280]">{actionMessage}</p>
            </div>
          </div>
          <StatusTransitionControl
            nextStatus={nextStatus}
            isUpdating={updateMutation.isPending}
            onAdvance={advanceStatus}
          />
        </div>
      </section>

      <div className="grid items-start gap-5 min-[901px]:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <DeliveryProgress currentStatus={deliveryStatus} variant="merchant" timestamps={stepTimestamps} />

          <Card className="min-w-0 rounded-xl border-[#f3f4f6] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300" aria-hidden="true">
                  <PackageSearch className="h-5 w-5" />
                </span>
                {translate('orders.detail.itemsTitle', 'Order Items')}
                <span className="text-xs font-normal text-[#9ca3af]">{`(${itemCountLabel})`}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {order.items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {translate('orders.detail.noItems', 'No items in this order.')}
                </p>
              ) : (
                order.items.map((item) => <OrderItemRow key={item.id} item={item} />)
              )}

              {order.items.length > 0 && (
                <div className="space-y-2 border-t border-[#f3f4f6] pt-3">
                  <div className="flex items-start justify-between gap-4">
                    <span className="min-w-0 text-[#6b7280]">
                      {translate('orders.detail.subtotal', 'Subtotal')}
                    </span>
                    <span className="shrink-0 font-medium text-[#111827]">
                      {formatCurrencyAmount(subtotal)}
                    </span>
                  </div>
                  {hasDiscount && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="min-w-0 text-[#6b7280]">
                        {translate('orders.detail.discount', 'Discount')}
                      </span>
                      <span className="shrink-0 font-medium text-[#10b981]">
                        -{formatCurrencyAmount(order.discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="my-2 h-px bg-[#f3f4f6]" />
                  <div className="flex items-center justify-between gap-4 text-lg">
                    <span className="font-bold text-[#111827]">
                      {translate('orders.detail.total', 'Total')}
                    </span>
                    <span className="shrink-0 text-xl font-extrabold text-[#7c3aed]">
                      {formatCurrencyAmount(order.totalAmount)}
                    </span>
                  </div>
                  {commission && commissionRate && (
                    <div className="rounded-lg bg-[#f9f5ff] px-4 py-3 dark:bg-[#2a1f4d]">
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-[#7c3aed] dark:text-[#c4b5fd]">
                          {translate(
                            'orders.detail.commissionLabel',
                            `Commission (${Number(commissionRate)}%)`,
                          )}
                          {!revenueQuery.data?.commissionRateLocked && (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label={rateNote}
                                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[#7c3aed]/60 transition hover:text-[#7c3aed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]/40"
                                  >
                                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">{rateNote}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </span>
                        <span className="shrink-0 font-medium text-[#111827] dark:text-[#e5e7eb]">
                          -{formatCurrencyAmount(commission.commission)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-4">
                        <span className="text-sm font-semibold text-[#7c3aed] dark:text-[#c4b5fd]">
                          {translate('orders.detail.youReceive', 'You receive')}
                        </span>
                        <span className="text-lg font-extrabold text-[#7c3aed] dark:text-[#c4b5fd]">
                          {formatCurrencyAmount(commission.net)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4 min-[901px]:sticky min-[901px]:top-20">
          <CustomerInformationCard customer={order.customer} />

          <Card className="min-w-0 rounded-xl border-[#f3f4f6] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <section className="border-b border-[#f3f4f6] p-5">
              <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#111827]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300" aria-hidden="true">
                  <MapPin className="h-5 w-5" />
                </span>
                {translate('orders.detail.shippingTitle', 'Shipping Address')}
                {address.length > 0 && (
                  <CopyButton
                    value={address.join('\n')}
                    label={translate('orders.detail.copyAddress', 'Copy shipping address')}
                    className="ml-auto text-[#9ca3af] hover:bg-[#f3f0ff] hover:text-[#7c3aed] focus-visible:ring-[#7c3aed]/50"
                  />
                )}
              </h2>
              <div className="ml-0">
                {address.length > 0 ? (
                  <address className="text-sm not-italic leading-relaxed text-[#374151]">
                    {address.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                ) : (
                  <p className="text-sm text-[#6b7280]">
                    {translate('orders.detail.noAddress', 'Shipping address is not available for this order.')}
                  </p>
                )}
              </div>
            </section>
            <section className="space-y-3 p-5 text-sm">
              <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#111827]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300" aria-hidden="true">
                  <CreditCard className="h-5 w-5" />
                </span>
                {translate('orders.detail.paymentTitle', 'Payment')}
              </h2>
              <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">Method</span>
                <span className="font-medium text-[#111827]">{paymentMethodLabel(order.paymentMethod)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">Status</span>
                <PaymentBadge status={order.paymentStatus} />
              </div>
            </section>
          </Card>
        </div>
      </div>

      {order.notes && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <StickyNote className="h-4 w-4 text-purple-600" aria-hidden="true" />
              {translate('orders.detail.notesTitle', 'Order Note')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="whitespace-pre-line text-sm text-foreground">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function MerchantOrderDetailPage() {
  return <MerchantOrderDetailContent />;
}