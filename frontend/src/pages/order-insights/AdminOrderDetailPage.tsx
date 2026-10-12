import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Check, CreditCard, ExternalLink, ImageOff, MapPin, PackageSearch, Printer, Store, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/image-url';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerInformationCard } from '@/features/order-insights/components/CustomerInformationCard';
import { CopyButton } from '@/features/order-insights/components/CopyButton';
import { DeliveryProgress } from '@/features/order-insights/components/DeliveryProgress';
import { PaymentBadge } from '@/features/order-insights/components/PaymentBadge';
import { StatusBadge } from '@/features/order-insights/components/StatusBadge';
import { useAdminOrderDetail } from '@/features/order-insights/hooks/useAdminOrderDetail';
import { useAdminOrderTracking } from '@/features/order-insights/hooks/useAdminOrderTracking';
import { printAdminOrder } from '@/features/order-insights/utils/printAdminOrder';
import { toSlashDisplayDate } from '@/features/order-insights/utils/dateRangeLabel';
import { formatCurrencyAmount, getHttpStatus } from '@/features/order-insights/types/merchantOrderInsights.types';
import { OrderStatus } from '@/features/order-insights/types/orderInsights.types';
import type { AdminOrderDetailDto } from '@/features/order-insights/types/adminOrderInsights.types';

/**
 * Line-item image with a graceful fallback: order history outlives the product
 * catalogue, so a removed product or an unreachable file must not leave a broken
 * image in the list. The name sits right beside it, so the image is decorative.
 */
function AdminOrderItemImage({ src }: { src?: string | null }) {
  const [failed, setFailed] = useState(false);
  const url = src ? getImageUrl(src) : '';

  if (!url || failed) {
    return (
      <span
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#f3f4f6] bg-muted/40 text-muted-foreground dark:border-[#29252f] oidark:border-outline-variant"
      >
        <ImageOff className="h-5 w-5" />
      </span>
    );
  }

  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-xl border border-[#f3f4f6] bg-muted/30 object-cover dark:border-[#29252f] oidark:border-outline-variant"
    />
  );
}

function formatAddress(order: AdminOrderDetailDto): string[] {
  const address = order.shippingAddress;
  return [
    address.recipientName ?? address.name,
    address.addressLine1 ?? address.line1,
    address.addressLine2 ?? address.line2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(', '),
    address.country,
    address.phone,
  ].filter((line): line is string => Boolean(line));
}

/** e.g. `2026/09/01, 12:00 PM` (empty string when the value is not a date). */
function formatDateTime(value: string): string {
  const datePart = toSlashDisplayDate(value);
  if (!datePart) return '';
  const parsed = new Date(value);
  const time = Number.isNaN(parsed.getTime()) ? '' : `, ${parsed.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  return `${datePart}${time}`;
}

function AdminOrderDetailSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="space-y-5 p-2 lg:p-4" aria-busy="true" aria-label={t('orders.detail.loading', 'Loading order')}>
      <div className="flex items-center justify-between gap-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-9 w-36" /></div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Skeleton className="h-80 w-full rounded-xl" />
        <div className="space-y-5"><Skeleton className="h-48 w-full rounded-xl" /><Skeleton className="h-48 w-full rounded-xl" /></div>
      </div>
    </div>
  );
}

function AdminOrderDetailContent() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const orderQuery = useAdminOrderDetail(id);
  const trackingQuery = useAdminOrderTracking(id);

  if (orderQuery.isLoading) return <AdminOrderDetailSkeleton />;

  if (orderQuery.error) {
    const notFound = getHttpStatus(orderQuery.error) === 404;
    return (
      <div className="p-2 lg:p-4">
        <Alert variant="destructive">
          <AlertTitle>{notFound ? t('orders.detail.notFound.title', 'Order not found') : t('admin.orders.detail.loadFailedTitle', 'Unable to load order')}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{notFound ? t('admin.orders.detail.notFoundDescription', 'This order could not be found.') : t('admin.orders.error.tryAgain', 'Please try again.')}</span>
            {!notFound && <Button variant="outline" size="sm" onClick={() => void orderQuery.refetch()}>{t('common.actions.retry', 'Retry')}</Button>}
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4 gap-2"><Link to="/admin/orders"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t('admin.orders.detail.backToAllOrders', 'Back to All Orders')}</Link></Button>
      </div>
    );
  }

  const order = orderQuery.data;
  if (!order) return null;

  const address = formatAddress(order);
  const subtotal = order.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const discount = Number(order.discountAmount);
  const date = formatDateTime(order.createdAt);
  const tracking = trackingQuery.data;
  const trackingSteps = Array.isArray(tracking?.steps) ? tracking.steps : [];
  const stepTimestamps = Object.fromEntries(
    trackingSteps.filter((step) => step.reachedAt).map((step) => [step.statusCode, step.reachedAt!]),
  );
  const deliveredAt = trackingSteps.find((step) => step.statusCode === OrderStatus.DELIVERED)?.reachedAt;
  const summaryCardClass = 'min-w-0 rounded-xl border-[#f3f4f6] shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:border-[#29252f] dark:bg-[#111014] dark:shadow-none oidark:border-outline-variant oidark:bg-surface-container-low oidark:shadow-none';

  // Read-only hand-off to the browser's print dialog ("Save as PDF" lives there),
  // rendered into its own window so no print rule reaches the app itself.
  const handlePrint = () => {
    if (!printAdminOrder(order)) {
      toast.error(t('admin.orders.detail.printPopupBlocked', 'Allow pop-ups for this site to print or save this order as a PDF.'));
    }
  };

  return (
    <main className="w-full max-w-full space-y-5 p-2 lg:p-4">
      <section className="flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] px-4 py-4 text-white shadow-[0_8px_20px_rgba(124,58,237,0.2)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[1.2px] opacity-85">{t('admin.orders.detail.title', 'Order Details')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold leading-tight sm:text-xl">{t('admin.orders.detail.orderHeading', `Order ${order.orderNumber}`, { orderNumber: order.orderNumber })}</h1>
            <CopyButton value={order.orderNumber} label={t('admin.orders.copyOrderNumber', 'Copy order number')} className="text-white/85 hover:bg-white/15 hover:text-white focus-visible:ring-white/80" />
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-[13px] opacity-90">{t('admin.orders.detail.placedAt', `Placed ${date}`, { date })}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="gap-2 border-white/70 bg-transparent text-white hover:bg-white/15 hover:text-white"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />{t('admin.orders.detail.printPdf', 'Print / Save as PDF')}
          </Button>
          <Button asChild className="gap-2 bg-white text-[#7c3aed] hover:bg-white/90"><Link to="/admin/orders"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t('admin.orders.detail.backToAllOrders', 'Back to All Orders')}</Link></Button>
        </div>
      </section>

      {order.status === OrderStatus.DELIVERED && deliveredAt && (
        <section className="flex items-center gap-3 rounded-xl border-l-4 border-[#7c3aed] bg-[#f3f0ff] px-4 py-3.5 dark:bg-[#18131f] oidark:bg-surface-container-low">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#7c3aed] text-white" aria-hidden="true"><Check className="h-5 w-5" /></span>
          <div><h2 className="text-sm font-bold">{t('admin.orders.detail.deliveredTitle', 'Order delivered')}</h2><p className="text-[13px] text-muted-foreground">{t('admin.orders.detail.deliveredOn', `Completed on ${formatDateTime(deliveredAt)}.`, { date: formatDateTime(deliveredAt) })}</p></div>
        </section>
      )}

      {trackingQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>{t('admin.orders.detail.trackingErrorTitle', 'Unable to load delivery progress')}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>{t('admin.orders.error.tryAgain', 'Please try again.')}</span><Button variant="outline" size="sm" onClick={() => void trackingQuery.refetch()}>{t('common.actions.retry', 'Retry')}</Button></AlertDescription>
        </Alert>
      ) : (
        <>
          <DeliveryProgress currentStatus={tracking?.currentStatus ?? order.status} variant="merchant" timestamps={stepTimestamps} />
          {tracking && !tracking.historyAvailable && <p className="-mt-3 px-1 text-sm text-muted-foreground">{t('admin.orders.detail.historyUnavailable', 'Detailed history unavailable for this order.')}</p>}
        </>
      )}

      <section aria-label={t('admin.orders.detail.summaryLabel', 'Order summary')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className={summaryCardClass}>
          <CardContent className="flex h-full items-start gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 oidark:bg-violet-950 oidark:text-violet-300"><Store className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <h2 className="text-xs font-semibold text-muted-foreground">{t('admin.orders.table.shopMerchant', 'Shop / Merchant')}</h2>
              <p className="mt-1 break-words text-sm font-semibold">{order.shop.name}</p>
              {order.shop.merchantName && <p className="mt-1 break-words text-xs text-muted-foreground">{t('admin.orders.detail.merchantContact', `Merchant contact: ${order.shop.merchantName}`, { name: order.shop.merchantName })}</p>}
              {order.shop.merchantId && <p className="mt-1 break-all text-xs text-muted-foreground">{t('admin.orders.detail.merchantId', `Merchant ID: ${order.shop.merchantId}`, { id: order.shop.merchantId })}</p>}
            </div>
          </CardContent>
        </Card>
        <CustomerInformationCard customer={order.customer} />
        <Card className={summaryCardClass}>
          <CardContent className="h-full p-4">
            <h2 className="flex items-center gap-3 text-xs font-semibold text-muted-foreground"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 oidark:bg-emerald-950 oidark:text-emerald-300"><CreditCard className="h-5 w-5" aria-hidden="true" /></span>{t('orders.detail.paymentTitle', 'Payment')}</h2>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{t('admin.orders.detail.method', 'Method')}</span><span className="font-medium">{order.paymentMethod.replaceAll('_', ' ')}</span></div>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{t('orders.filter.status', 'Status')}</span><PaymentBadge status={order.paymentStatus} /></div>
          </CardContent>
        </Card>
        <Card className={summaryCardClass}>
          <CardContent className="h-full p-4">
            <h2 className="text-xs font-semibold text-muted-foreground">{t('admin.orders.detail.orderTotal', 'Order total')}</h2>
            <p className="mt-2 text-2xl font-extrabold text-[#7c3aed] oidark:text-primary">{formatCurrencyAmount(order.totalAmount)}</p>
            <div className="mt-3 space-y-1.5 border-t pt-3 text-sm dark:border-[#29252f] oidark:border-outline-variant">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">{t('orders.detail.subtotal', 'Subtotal')}</span><span>{formatCurrencyAmount(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between gap-3"><span className="text-muted-foreground">{order.couponCode ? t('orders.detail.discountWithCoupon', `Discount (${order.couponCode})`, { code: order.couponCode }) : t('orders.detail.discount', 'Discount')}</span><span className="text-emerald-600">−{formatCurrencyAmount(discount)}</span></div>}
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid items-start gap-5 min-[901px]:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <Card className="min-w-0 rounded-xl border-[#f3f4f6] shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:border-[#29252f] dark:bg-[#111014] dark:shadow-none oidark:border-outline-variant oidark:bg-surface-container-low oidark:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 oidark:bg-violet-950 oidark:text-violet-300"><PackageSearch className="h-5 w-5" aria-hidden="true" /></span>{t('orders.detail.itemsTitle', 'Order Items')} <span className="text-sm font-normal text-muted-foreground">{order.items.length === 1 ? t('admin.orders.detail.itemsCount_one', `(${order.items.length} item)`, { count: order.items.length }) : t('admin.orders.detail.itemsCount_other', `(${order.items.length} items)`, { count: order.items.length })}</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{t('orders.detail.noItems', 'No items in this order.')}</p> : order.items.map((item) => (
              <div key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[#f3f4f6] bg-muted/20 p-3 transition-colors hover:bg-muted/40 sm:p-4 dark:border-[#29252f] dark:hover:bg-muted/40">
                <AdminOrderItemImage src={item.productImage} />
                <div className="min-w-0">
                  {item.productId ? (
                    <Link
                      to={`/products/${item.productId}`}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-sm font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="break-words">{item.productName}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                    </Link>
                  ) : (
                    <p className="break-words font-medium">{item.productName}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">{t('admin.orders.detail.quantityUnitPrice', `Quantity: ${item.quantity} · Unit price: ${formatCurrencyAmount(item.unitPrice)}`, { quantity: item.quantity, unitPrice: formatCurrencyAmount(item.unitPrice) })}</p>
                </div>
                <div className="text-right"><p className="text-xs text-muted-foreground">{t('admin.orders.detail.lineTotal', 'Line total')}</p><p className="font-semibold">{formatCurrencyAmount(item.totalPrice)}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="min-w-0">
          <Card className={summaryCardClass}>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-3 text-[13px]"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-600 oidark:bg-sky-950 oidark:text-sky-300"><MapPin className="h-5 w-5" aria-hidden="true" /></span>{t('orders.detail.shippingTitle', 'Shipping Address')}</CardTitle></CardHeader>
            <CardContent>
              {address.length ? <address className="space-y-1 text-sm not-italic">{address.map((line, index) => <span key={`${index}-${line}`} className="block">{line}</span>)}</address> : <p className="text-sm text-muted-foreground">{t('admin.orders.detail.noAddress', 'Shipping address is not available.')}</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {order.notes && <Card className="border-border/80 shadow-xs"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><StickyNote className="h-4 w-4 text-primary" aria-hidden="true" />{t('orders.detail.notesTitle', 'Order Note')}</CardTitle></CardHeader><CardContent><p className="whitespace-pre-line text-sm">{order.notes}</p></CardContent></Card>}
    </main>
  );
}

export default function AdminOrderDetailPage() {
  return <AdminOrderDetailContent />;
}
