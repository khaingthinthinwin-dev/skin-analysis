import { Link, useParams } from 'react-router';
import { ArrowLeft, MapPin, PackageSearch, StickyNote } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerInformationCard } from '@/features/order-insights/components/CustomerInformationCard';
import { PaymentBadge } from '@/features/order-insights/components/PaymentBadge';
import { StatusBadge } from '@/features/order-insights/components/StatusBadge';
import { useAdminOrderDetail } from '@/features/order-insights/hooks/useAdminOrderDetail';
import { formatCurrencyAmount, getHttpStatus } from '@/features/order-insights/types/merchantOrderInsights.types';
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

  return (
    <main className="w-full max-w-full space-y-5 p-2 lg:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Order {order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed {date}</p>
        </div>
        <Button asChild variant="outline" className="gap-2"><Link to="/admin/orders"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to All Orders</Link></Button>
      </div>

      <Card className="border-border/80 shadow-xs">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm text-muted-foreground">Order status</p>
            <div className="mt-2"><StatusBadge status={order.status} className="px-3 py-1 text-xs" /></div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Payment</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-medium">
              <span>{order.paymentMethod.replaceAll('_', ' ')}</span><PaymentBadge status={order.paymentStatus} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card className="min-w-0 border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><PackageSearch className="h-5 w-5 text-primary" aria-hidden="true" />Order Items <span className="text-sm font-normal text-muted-foreground">({order.items.length})</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No items in this order.</p> : order.items.map((item) => (
              <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 sm:p-4">
                <div className="min-w-0">
                  <p className="break-words font-medium">{item.productName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Quantity: {item.quantity} · Unit price: {formatCurrencyAmount(item.unitPrice)}</p>
                </div>
                <div className="text-right"><p className="text-xs text-muted-foreground">Line total</p><p className="font-semibold">{formatCurrencyAmount(item.totalPrice)}</p></div>
              </div>
            ))}
            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrencyAmount(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span><span className="text-emerald-600">−{formatCurrencyAmount(discount)}</span></div>}
              <div className="flex justify-between gap-3 border-t pt-3 text-lg font-bold"><span>Total</span><span>{formatCurrencyAmount(order.totalAmount)}</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-2"><CardTitle className="text-base">Shop / Merchant</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{order.shop.name}</p>
              {order.shop.merchantId && <p className="break-all text-muted-foreground">Merchant ID: {order.shop.merchantId}</p>}
            </CardContent>
          </Card>

          <CustomerInformationCard customer={order.customer} />

          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4 text-primary" aria-hidden="true" />Shipping Address</CardTitle></CardHeader>
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
