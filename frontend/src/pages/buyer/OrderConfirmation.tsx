import { useMemo } from 'react';
import { useParams, Link } from 'react-router';
import {
  CheckCircle2,
  ShoppingBag,
  ExternalLink,
  Package,
  Truck,
  CreditCard,
  Calendar,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useOrderDetail } from '@/features/buyer/checkout/hooks/useCheckout';

function getImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const base = raw.replace(/\/api\/v1\/?$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

function formatCurrency(amount: string | number): string {
  return `$${Number.parseFloat(String(amount) || '0').toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getBrandFromSlug(slug: string): string {
  const parts = slug.split('-');
  return parts.length > 1
    ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    : 'Premium';
}

function getVariantFromSlug(slug: string): string {
  const parts = slug.split('-');
  if (parts.length <= 2) return 'Standard Size';
  return parts
    .slice(1)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function getPaymentLabel(method: string): string {
  switch (method) {
    case 'cod':
      return 'Cash on Delivery';
    case 'bank_transfer':
      return 'Bank Transfer';
    case 'card':
      return 'Credit / Debit Card';
    default:
      return method;
  }
}

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const {
    data: order,
    isLoading,
    isError,
  } = useOrderDetail(orderId || '');

  const computed = useMemo(() => {
    if (!order) return null;

    // Subtotal = sum of each item's totalPrice (unitPrice * quantity)
    const itemsSubtotal = order.items.reduce(
      (sum, item) => sum + Number.parseFloat(item.totalPrice),
      0,
    );

    // Per-shop voucher breakdown
    const voucherEntries: { code: string; discount: number }[] = [];
    if (order.voucherCodes) {
      for (const info of Object.values(order.voucherCodes)) {
        voucherEntries.push({
          code: info.code,
          discount: Number.parseFloat(String(info.discountAmount)),
        });
      }
    } else if (order.couponCode && Number.parseFloat(order.discountAmount) > 0) {
      // Legacy single coupon
      voucherEntries.push({
        code: order.couponCode,
        discount: Number.parseFloat(order.discountAmount),
      });
    }

    const totalDiscount = voucherEntries.reduce((s, v) => s + v.discount, 0);
    const finalTotal = Math.max(itemsSubtotal - totalDiscount, 0);

    return { itemsSubtotal, voucherEntries, totalDiscount, finalTotal };
  }, [order]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !order || !computed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 px-4 text-center">
        <h2 className="text-xl font-bold">Order not found</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          We couldn&apos;t retrieve the details for this order. It may have been moved or the link might be incorrect.
        </p>
        <Link to="/buyer/order-insights">
          <Button variant="outline">View Order History</Button>
        </Link>
      </div>
    );
  }

  const { itemsSubtotal, voucherEntries, totalDiscount, finalTotal } = computed;
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="order-confirmation w-full max-w-2xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6" data-testid="order-confirmation">
      {/* ── Success Header ─────────────────────────── */}
      <div className="text-center space-y-2 sm:space-y-3">
        <div className="inline-flex items-center justify-center rounded-full bg-green-500/10 p-3 sm:p-4 mb-1">
          <CheckCircle2 className="h-10 w-10 sm:h-14 sm:w-14 text-green-500" />
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground break-words">
          Order Placed Successfully!
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground break-all">
          Order{' '}
          <span className="font-mono font-medium text-foreground">
            #{order.orderNumber}
          </span>
        </p>
      </div>

      {/* ── Order Summary Card ──────────────────────── */}
      <Card className="border-border/80 shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-5">
          {/* Date/Time + Item Count */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground/80" />
              <span className="truncate">
                {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
              </span>
            </div>
            <Badge variant="secondary" className="gap-1 shrink-0 text-xs">
              <Package className="h-3 w-3" />
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Badge>
          </div>

          <Separator />

          {/* ── Items ─────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Reserved Formulations
            </h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 transition-colors sm:gap-4"
                >
                  {item.productImage ? (
                    <img
                      src={getImageUrl(item.productImage)}
                      alt={item.productName}
                      className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-md object-cover border border-border/40"
                    />
                  ) : (
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-md bg-background border border-border/50">
                      <Package className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 font-medium uppercase tracking-wide shrink-0"
                      >
                        {getBrandFromSlug(item.productSlug)}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium leading-snug break-words line-clamp-2">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getVariantFromSlug(item.productSlug)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 pl-1">
                    <p className="text-sm sm:text-base font-semibold">
                      {formatCurrency(item.totalPrice)}
                    </p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── Financial Breakdown ─────────────────── */}
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium shrink-0">{formatCurrency(itemsSubtotal)}</span>
            </div>

            {voucherEntries.map((v) => (
              <div
                key={v.code}
                className="flex items-center justify-between gap-2 text-green-600"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Tag className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Voucher {v.code}</span>
                </span>
                <span className="font-medium shrink-0">
                  -{formatCurrency(v.discount)}
                </span>
              </div>
            ))}

            {totalDiscount === 0 && order.discountAmount && Number.parseFloat(order.discountAmount) > 0 && (
              <div className="flex items-center justify-between gap-2 text-green-600">
                <span className="flex items-center gap-1.5 min-w-0">
                  <Tag className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Discount</span>
                </span>
                <span className="font-medium shrink-0">
                  -{formatCurrency(order.discountAmount)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1.5 min-w-0">
                <Truck className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate sm:whitespace-normal">
                  Standard Complimentary Courier
                </span>
              </span>
              <span className="font-medium text-green-600 shrink-0">Free</span>
            </div>
          </div>

          <Separator />

          {/* ── Total Due ───────────────────────────── */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Total Due
                </p>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {formatCurrency(finalTotal)}
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <p className="text-xs text-muted-foreground">Tax included</p>
                <Badge
                  variant={
                    order.paymentStatus === 'paid' ? 'default' : 'secondary'
                  }
                  className="mt-1 gap-1 text-xs"
                >
                  <CreditCard className="h-3 w-3" />
                  {order.paymentStatus === 'paid'
                    ? 'Paid'
                    : 'Pending Payment'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Shipping Address ─────────────────────────── */}
      <Card className="border-border/80 shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Shipping Address
            </h3>
            <div className="text-xs sm:text-sm space-y-1 text-foreground">
              <p className="font-semibold text-sm">
                {order.shippingAddress.recipientName}
              </p>
              <p className="text-muted-foreground break-words leading-relaxed">
                {order.shippingAddress.addressLine1}
                {order.shippingAddress.addressLine2 &&
                  `, ${order.shippingAddress.addressLine2}`}
              </p>
              <p className="text-muted-foreground break-words">
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postalCode}
              </p>
              <p className="text-muted-foreground break-words">
                {order.shippingAddress.country}
              </p>
            </div>
          </div>

          <Separator />

          {/* ── Payment Method ─────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Payment Method
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">{getPaymentLabel(order.paymentMethod)}</span>
              </div>
              <Badge
                variant={
                  order.paymentStatus === 'paid' ? 'default' : 'outline'
                }
                className="gap-1 self-start sm:self-auto text-xs"
              >
                {order.paymentStatus === 'paid'
                  ? 'Paid'
                  : 'Pending Payment on Delivery'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Action Buttons ──────────────────────────── */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full max-w-md mx-auto pt-2">
        <Link to={`/buyer/orders/${order.id}`} className="w-full sm:flex-1">
          <Button variant="outline" className="w-full h-11 text-sm font-medium">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Order
          </Button>
        </Link>
        <Link to="/buyer/search" className="w-full sm:flex-1">
          <Button className="w-full h-11 text-sm font-medium">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}
