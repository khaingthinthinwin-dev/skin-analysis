"use client";

import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { AxiosError } from "axios";
import {
  ArrowLeft,
  Download,
  PackageSearch,
  RotateCcw,
  StickyNote,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeliveryProgress } from "@/features/order-insights/components/DeliveryProgress";
import { PaymentBadge } from "@/features/order-insights/components/PaymentBadge";
import { useOrderDetail } from "@/features/order-insights/hooks/useOrderDetail";
import { printInvoice } from "@/features/order-insights/utils/printInvoice";
import type {
  OrderDetailResponseDto,
  OrderShippingAddress,
} from "@/features/order-insights/types/orderInsights.types";
import { OrderStatus } from "@/features/order-insights/types/orderInsights.types";

function formatMoney(value: string): string {
  return `$${parseFloat(value).toFixed(2)}`;
}

function formatDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(value: string, locale: string): string {
  return new Date(value).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const raw =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";
  const base = raw.replace(/\/api\/v1\/?$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

function orderReference(order: OrderDetailResponseDto): string {
  return order.orderNumber || `#${order.id.slice(0, 8).toUpperCase()}`;
}

function addressLines(address: OrderShippingAddress): string[] {
  return [
    address.recipientName,
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state, address.postalCode]
      .filter(Boolean)
      .join(", "),
    address.country,
    address.phone,
  ].filter((line): line is string => Boolean(line));
}

function paymentMethodLabel(method: string): string {
  return method
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusCopy(status: OrderStatus, deliveredDate: string) {
  switch (status) {
    case OrderStatus.PLACED:
      return {
        title: "We've received your order",
        message: "Waiting for the seller to confirm your order.",
      };
    case OrderStatus.CONFIRMED:
      return {
        title: "Your order is confirmed",
        message:
          "The seller has accepted your order and is preparing it. Estimated delivery: Sep 20 - Sep 22, 2026.",
      };
    case OrderStatus.PACKED:
      return {
        title: "Your order is packed",
        message: "Your items are packed and ready for pickup by the courier.",
      };
    case OrderStatus.SHIPPED:
      return {
        title: "Your order has shipped",
        message: "On the way! Track your package with the courier.",
      };
    case OrderStatus.OUT_FOR_DELIVERY:
      return {
        title: "Out for delivery today",
        message: "Your order is arriving today.",
      };
    case OrderStatus.DELIVERED:
      return {
        title: `Delivered on ${deliveredDate}`,
        message: "Enjoy your purchase!",
      };
  }
}

function BuyerOrderDetailSkeleton() {
  const { t } = useTranslation();

  return (
    <div
      className="space-y-6 p-2 lg:p-4"
      aria-busy="true"
      aria-label={t("orders.detail.loading", "Loading order")}
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

function BuyerOrderDetailNotFound() {
  const { t } = useTranslation();

  return (
    <Card className="border-border/80 shadow-xs">
      <CardContent className="py-16 px-4 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
          <PackageSearch
            className="h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          {t("orders.detail.notFound.title", "Order not found")}
        </h3>
        <p className="mx-auto mb-6 max-w-sm text-sm text-muted-foreground">
          {t(
            "orders.detail.notFound.description",
            "The order you are looking for could not be found. It may have been opened from an old link.",
          )}
        </p>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/orders">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("orders.detail.backToOrders", "Back to My Orders")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function BuyerOrderDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { data: order, isLoading, error, refetch } = useOrderDetail(id);
  const dateLocale = i18n.resolvedLanguage || i18n.language || "en-US";

  if (isLoading) {
    return <BuyerOrderDetailSkeleton />;
  }

  if (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return (
        <div className="p-2 lg:p-4">
          <BuyerOrderDetailNotFound />
        </div>
      );
    }

    return (
      <div className="p-2 lg:p-4">
        <Alert variant="destructive">
          <AlertTitle>
            {t("orders.detail.error.title", "Something went wrong")}
          </AlertTitle>
          <AlertDescription>
            <p>
              {t(
                "orders.detail.error.description",
                "We could not load this order. Please try again.",
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => refetch()}
            >
              {t("common.actions.retry", "Retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const subtotal = order.items
    .reduce((sum, item) => sum + parseFloat(item.totalPrice), 0)
    .toFixed(2);
  const address = addressLines(order.shippingAddress);

  return (
    <div className="space-y-6 p-2 lg:p-4">
      <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] px-5 py-5 text-white shadow-[0_8px_20px_rgba(124,58,237,0.2)] sm:px-7">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[1px] opacity-85">
            📦 Order Details
          </p>
          <h1 className="mt-1 text-xl font-bold">Order {orderReference(order)}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm opacity-90">
            <span>
              Placed {formatDate(order.createdAt, dateLocale)}, {formatTime(order.createdAt, dateLocale)}
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
              ● {order.status.replaceAll("_", " ").toUpperCase()}
            </span>
          </div>
        </div>
        <Button asChild className="gap-2 rounded-lg bg-white px-5 py-2.5 text-[13px] font-semibold text-[#7c3aed] hover:bg-white/90">
          <Link to="/orders">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to My Orders
          </Link>
        </Button>
      </section>

      {(() => {
        const copy = statusCopy(order.status, formatDate(order.createdAt, dateLocale));
        return (
          <section className="flex items-center gap-3 rounded-xl border-l-4 border-[#7c3aed] bg-[#f3f0ff] px-5 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#7c3aed] text-lg text-white">
              ✓
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#111827]">{copy.title}</h2>
              <p className="text-[13px] text-[#6b7280]">{copy.message}</p>
            </div>
          </section>
        );
      })()}

      <div className="grid items-start gap-5 min-[901px]:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <DeliveryProgress currentStatus={order.status} />

          <Card className="rounded-xl border-[#f3f4f6] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                📦 {t("orders.detail.itemsTitle", "Order Items")}
                <span className="text-xs font-normal text-[#9ca3af]">({order.items.length} items)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {order.items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("orders.detail.noItems", "No items in this order.")}
                </p>
              ) : order.items.map((item) => {
                const image = getImageUrl(item.productImage);
                return (
                  <div key={item.id} className="flex items-center gap-4 rounded-[10px] border border-[#f3f4f6] bg-[#fafafa] p-4">
                    {image ? (
                      <img src={image} alt={item.productName} className="h-14 w-14 shrink-0 rounded-[10px] object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#f3f0ff] to-[#fce7f3] text-2xl">
                        💄
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#111827]">{item.productName}</p>
                      <p className="text-[13px] text-[#6b7280]">Qty: {item.quantity} × {formatMoney(item.unitPrice)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] uppercase text-[#9ca3af]">Line total</p>
                      <p className="text-base font-bold text-[#111827]">{formatMoney(item.totalPrice)}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Card className="min-w-0 rounded-xl border-[#f3f4f6] shadow-[0_2px_8px_rgba(0,0,0,0.04)] min-[901px]:sticky min-[901px]:top-20">
          <section className="border-b border-[#f3f4f6] p-5">
            <h2 className="mb-3 text-[13px] font-bold text-[#111827]">📍 Shipping Address</h2>
            <div>
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
                  {t(
                    "orders.detail.noAddress",
                    "Shipping address is not available for this order.",
                  )}
                </p>
              )}
            </div>
          </section>
          <section className="space-y-3 border-b border-[#f3f4f6] p-5 text-sm">
            <h2 className="text-[13px] font-bold text-[#111827]">💳 Payment</h2>
            <div className="flex items-center justify-between"><span className="text-[#6b7280]">Method</span><span className="font-medium text-[#111827]">{paymentMethodLabel(order.paymentMethod)}</span></div>
            <div className="flex items-center justify-between"><span className="text-[#6b7280]">Status</span><PaymentBadge status={order.paymentStatus} /></div>
          </section>
          <section className="space-y-2 p-5 text-sm">
            <h2 className="mb-3 text-[13px] font-bold text-[#111827]">🧾 Order Summary</h2>
              <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">
                  {t("orders.detail.subtotal", "Subtotal")}
                </span>
                <span className="font-medium text-[#111827]">{formatMoney(subtotal)}</span>
              </div>
              {parseFloat(order.discountAmount) > 0 && <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">
                  {order.couponCode
                    ? t(
                        "orders.detail.discountWithCoupon",
                        "Discount ({{code}})",
                        { code: order.couponCode },
                      )
                    : t("orders.detail.discount", "Discount")}
                </span>
                <span className="font-medium text-[#10b981]">
                  -{formatMoney(order.discountAmount)}
                </span>
              </div>}
              <div className="my-3 h-px bg-[#f3f4f6]" />
              <div className="flex items-center justify-between text-base">
                <span className="font-bold text-[#111827]">
                  {t("orders.detail.total", "Total")}
                </span>
                <span className="text-lg font-bold text-[#7c3aed]">
                  {formatMoney(order.totalAmount)}
                </span>
              </div>
          </section>
        </Card>
      </div>

      {order.notes && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <StickyNote
                className="h-4 w-4 text-purple-600"
                aria-hidden="true"
              />
              {t("orders.detail.notesTitle", "Order Note")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="whitespace-pre-line text-sm text-foreground">
              {order.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 rounded-xl border border-[#f3f4f6] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:px-5">
        <Button asChild className="gap-2 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#ec4899] px-[18px] text-[13.5px] font-semibold shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:opacity-90">
          <Link to="/buyer/search"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Buy Again</Link>
        </Button>
        <Button
          variant="outline"
          className="gap-2 rounded-lg border-[#e5e7eb] bg-white px-[18px] text-[13.5px] font-semibold text-[#374151] hover:border-[#7c3aed] hover:bg-white hover:text-[#7c3aed] active:bg-[#7c3aed] active:text-white"
          onClick={() => printInvoice(order)}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download Invoice
        </Button>
      </div>
    </div>
  );
}

export default function BuyerOrderDetailPage() {
  return <BuyerOrderDetailContent />;
}
