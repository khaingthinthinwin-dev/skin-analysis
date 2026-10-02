import { Link, useParams } from 'react-router';
import { ArrowLeft, Check, CreditCard, MapPin, PackageSearch, Store, StickyNote } from 'lucide-react';
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
import { formatCurrencyAmount, getHttpStatus } from '@/features/order-insights/types/merchantOrderInsights.types';
import { OrderStatus } from '@/features/order-insights/types/orderInsights.types';
import type { AdminOrderDetailDto } from '@/features/order-insights/types/adminOrderInsights.types';

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

function AdminOrderDetailSkeleton() {
  return (
    <div className="space-y-5 p-2 lg:p-4" aria-busy="true" aria-label="Loading order">
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
  const { id } = useParams<{ id: string }>();
  const orderQuery = useAdminOrderDetail(id);
  const trackingQuery = useAdminOrderTracking(id);

  if (orderQuery.isLoading) return <AdminOrderDetailSkeleton />;

  if (orderQuery.error) {
    const notFound = getHttpStatus(orderQuery.error) === 404;
    return (
      <div className="p-2 lg:p-4">
        <Alert variant="destructive">
          <AlertTitle>{notFound ? 'Order not found' : 'Unable to load order'}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{notFound ? 'This order could not be found.' : 'Please try again.'}</span>
            {!notFound && <Button variant="outline" size="sm" onClick={() => void orderQuery.refetch()}>Retry</Button>}
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4 gap-2"><Link to="/admin/orders"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to All Orders</Link></Button>
      </div>
    );
  }

  const order = orderQuery.data;
  if (!order) return null;

  const address = formatAddress(order);
  const subtotal = order.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const discount = Number(order.discountAmount);
  const date = new Date(order.createdAt).toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const tracking = trackingQuery.data;
  const trackingSteps = Array.isArray(tracking?.steps) ? tracking.steps : [];
  const stepTimestamps = Object.fromEntries(
    trackingSteps.filter((step) => step.reachedAt).map((step) => [step.statusCode, step.reachedAt!]),
  );
  const deliveredAt = trackingSteps.find((step) => step.statusCode === OrderStatus.DELIVERED)?.reachedAt;
  const summaryCardClass = 'min-w-0 rounded-xl border-[#f3f4f6] shadow-[0_2px_8px_rgba(0,0,0,0.04)] oidark:border-outline-variant oidark:bg-surface-container-low';

  return (
    <main className="w-full max-w-full space-y-5 p-2 lg:p-4">
      <section className="flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] px-4 py-4 text-white shadow-[0_8px_20px_rgba(124,58,237,0.2)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[1.2px] opacity-85">Order Details</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold leading-tight sm:text-xl">Order {order.orderNumber}</h1>
            <CopyButton value={order.orderNumber} label="Copy order number" className="text-white/85 hover:bg-white/15 hover:text-white focus-visible:ring-white/80" />
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-[13px] opacity-90">Placed {date}</p>
        </div>
        <div className="flex sm:justify-end">
          <Button asChild className="gap-2 bg-white text-[#7c3aed] hover:bg-white/90"><Link to="/admin/orders"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to All Orders</Link></Button>
        </div>
      </section>

      {order.status === OrderStatus.DELIVERED && deliveredAt && (
        <section className="flex items-center gap-3 rounded-xl border-l-4 border-[#7c3aed] bg-[#f3f0ff] px-4 py-3.5 dark:bg-[#18131f] oidark:bg-surface-container-low">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#7c3aed] text-white" aria-hidden="true"><Check className="h-5 w-5" /></span>
          <div><h2 className="text-sm font-bold">Order delivered</h2><p className="text-[13px] text-muted-foreground">Completed on {new Date(deliveredAt).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.</p></div>
        </section>
      )}

      {trackingQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load delivery progress</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>Please try again.</span><Button variant="outline" size="sm" onClick={() => void trackingQuery.refetch()}>Retry</Button></AlertDescription>
        </Alert>
      ) : (
        <>
          <DeliveryProgress currentStatus={tracking?.currentStatus ?? order.status} variant="merchant" timestamps={stepTimestamps} />
          {tracking && !tracking.historyAvailable && <p className="-mt-3 px-1 text-sm text-muted-foreground">Detailed history unavailable for this order.</p>}
        </>
      )}

      <section aria-label="Order summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className={summaryCardClass}>
          <CardContent className="flex h-full items-start gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 oidark:bg-violet-950 oidark:text-violet-300"><Store className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0"><h2 className="text-xs font-semibold text-muted-foreground">Shop / Merchant</h2><p className="mt-1 break-words text-sm font-semibold">{order.shop.name}</p>{order.shop.merchantId && <p className="mt-1 break-all text-xs text-muted-foreground">Merchant ID: {order.shop.merchantId}</p>}</div>
          </CardContent>
        </Card>
        <CustomerInformationCard customer={order.customer} />
        <Card className={summaryCardClass}>
          <CardContent className="h-full p-4">
            <h2 className="flex items-center gap-3 text-xs font-semibold text-muted-foreground"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 oidark:bg-emerald-950 oidark:text-emerald-300"><CreditCard className="h-5 w-5" aria-hidden="true" /></span>Payment</h2>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Method</span><span className="font-medium">{order.paymentMethod.replaceAll('_', ' ')}</span></div>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Status</span><PaymentBadge status={order.paymentStatus} /></div>
          </CardContent>
        </Card>
        <Card className={summaryCardClass}>
          <CardContent className="h-full p-4">
            <h2 className="text-xs font-semibold text-muted-foreground">Order total</h2>
            <p className="mt-2 text-2xl font-extrabold text-[#7c3aed] oidark:text-primary">{formatCurrencyAmount(order.totalAmount)}</p>
            <div className="mt-3 space-y-1.5 border-t pt-3 text-sm oidark:border-outline-variant">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrencyAmount(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between gap-3"><span className="text-muted-foreground">Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span><span className="text-emerald-600">−{formatCurrencyAmount(discount)}</span></div>}
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid items-start gap-5 min-[901px]:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <Card className="min-w-0 rounded-xl border-[#f3f4f6] shadow-[0_2px_8px_rgba(0,0,0,0.04)] oidark:border-outline-variant oidark:bg-surface-container-low">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 oidark:bg-violet-950 oidark:text-violet-300"><PackageSearch className="h-5 w-5" aria-hidden="true" /></span>Order Items <span className="text-sm font-normal text-muted-foreground">({order.items.length} {order.items.length === 1 ? 'item' : 'items'})</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No items in this order.</p> : order.items.map((item) => (
              <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-muted/20 p-3 sm:p-4 oidark:border-outline-variant oidark:bg-surface-container">
                <div className="min-w-0">
                  <p className="break-words font-medium">{item.productName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Quantity: {item.quantity} · Unit price: {formatCurrencyAmount(item.unitPrice)}</p>
                </div>
                <div className="text-right"><p className="text-xs text-muted-foreground">Line total</p><p className="font-semibold">{formatCurrencyAmount(item.totalPrice)}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="min-w-0">
          <Card className={summaryCardClass}>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-3 text-[13px]"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-600 oidark:bg-sky-950 oidark:text-sky-300"><MapPin className="h-5 w-5" aria-hidden="true" /></span>Shipping Address</CardTitle></CardHeader>
            <CardContent>
              {address.length ? <address className="space-y-1 text-sm not-italic">{address.map((line, index) => <span key={`${index}-${line}`} className="block">{line}</span>)}</address> : <p className="text-sm text-muted-foreground">Shipping address is not available.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {order.notes && <Card className="border-border/80 shadow-xs"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><StickyNote className="h-4 w-4 text-primary" aria-hidden="true" />Order Note</CardTitle></CardHeader><CardContent><p className="whitespace-pre-line text-sm">{order.notes}</p></CardContent></Card>}
    </main>
  );
}

export default function AdminOrderDetailPage() {
  return <AdminOrderDetailContent />;
}
