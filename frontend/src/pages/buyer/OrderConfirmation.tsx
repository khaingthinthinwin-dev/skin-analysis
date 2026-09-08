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

function formatCurrency(amount: string): string {
  return `$${parseFloat(amount).toFixed(2)}`;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h2 className="text-xl font-bold">Order not found</h2>
        <Link to="/buyer/order-insights">
          <Button variant="outline">View Order History</Button>
        </Link>
      </div>
    );
  }

  const subtotal = (
    parseFloat(order.totalAmount) + parseFloat(order.discountAmount)
  ).toFixed(2);
  const hasDiscount = parseFloat(order.discountAmount) > 0;
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="space-y-6 p-2 lg:p-4 max-w-2xl mx-auto">
      {/* ── Success Header ─────────────────────────── */}
      <div className="text-center space-y-3">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold">Order Placed Successfully!</h1>
        <p className="text-muted-foreground">
          Order{' '}
          <span className="font-mono font-medium">#{order.orderNumber}</span>
        </p>
      </div>

      {/* ── Order Summary Card ──────────────────────── */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="space-y-5 pt-6">
          {/* Date/Time + Item Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
              </span>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Package className="h-3 w-3" />
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Badge>
          </div>

          <Separator />

          {/* ── RESERVED FORMULATIONS ───────────────── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Reserved Formulations
            </h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background border border-border/50">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 font-medium uppercase tracking-wide"
                      >
                        {getBrandFromSlug(item.productSlug)}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium leading-snug truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getVariantFromSlug(item.productSlug)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">
                      {formatCurrency(item.unitPrice)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── Financial Breakdown ─────────────────── */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>

            {hasDiscount && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  {order.couponCode
                    ? `Coupon ${order.couponCode} (-10%)`
                    : 'Discount'}
                </span>
                <span className="font-medium">
                  -{formatCurrency(order.discountAmount)}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Standard Complimentary Courier
              </span>
              <span className="font-medium text-green-600">Free</span>
            </div>
          </div>

          <Separator />

          {/* ── Total Due ───────────────────────────── */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Total Due
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(order.totalAmount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Tax included</p>
                <Badge
                  variant={
                    order.paymentStatus === 'paid' ? 'default' : 'secondary'
                  }
                  className="mt-1 gap-1"
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
      <Card className="border-border/80 shadow-xs">
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Shipping Address
            </h3>
            <div className="text-sm space-y-0.5">
              <p className="font-medium">
                {order.shippingAddress.recipientName}
              </p>
              <p className="text-muted-foreground">
                {order.shippingAddress.addressLine1}
                {order.shippingAddress.addressLine2 &&
                  `, ${order.shippingAddress.addressLine2}`}
              </p>
              <p className="text-muted-foreground">
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postalCode}
              </p>
              <p className="text-muted-foreground">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{getPaymentLabel(order.paymentMethod)}</span>
              </div>
              <Badge
                variant={
                  order.paymentStatus === 'paid' ? 'default' : 'outline'
                }
                className="gap-1"
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
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
        <Link to="/buyer/search" className="flex-1">
          <Button className="w-full">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Continue Shopping
          </Button>
        </Link>
        <Link to={`/buyer/orders/${order.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Order
          </Button>
        </Link>
      </div>
    </div>
  );
}
