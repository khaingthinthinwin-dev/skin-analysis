"use client";

import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { AxiosError } from "axios";
import {
  ArrowLeft,
  Clock,
  CreditCard,
  MapPin,
  Package,
  PackageCheck,
  PackageSearch,
  Receipt,
  RotateCcw,
  Store,
  StickyNote,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeliveryProgress } from "@/features/order-insights/components/DeliveryProgress";
import { PaymentBadge } from "@/features/order-insights/components/PaymentBadge";
import { StatusBadge } from "@/features/order-insights/components/StatusBadge";
import { useOrderDetail } from "@/features/order-insights/hooks/useOrderDetail";
import type {
  OrderDetailResponseDto,
  OrderShippingAddress,
} from "@/features/order-insights/types/orderInsights.types";

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
            <PackageCheck
              className="h-6 w-6 text-purple-600"
              aria-hidden="true"
            />
            {t("orders.detail.title", "Order Details")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "orders.detail.subtitle",
              "Review your order items, payment, and shipping information",
            )}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/orders">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("orders.detail.backToOrders", "Back to My Orders")}
          </Link>
        </Button>
      </div>

      <Card className="border-border/80 shadow-xs">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("orders.detail.orderNumber", "Order")}
              </p>
              <p className="mt-1 font-mono text-xl font-bold text-foreground">
                {orderReference(order)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {formatDate(order.createdAt, dateLocale)},{" "}
                  {formatTime(order.createdAt, dateLocale)}
                </span>
                {order.shop?.name && (
                  <span className="inline-flex items-center gap-1.5">
                    <Store className="h-4 w-4" aria-hidden="true" />
                    {order.shop.name}
                  </span>
                )}
              </div>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-5 min-[880px]:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <DeliveryProgress currentStatus={order.status} />

          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package
                  className="h-4 w-4 text-purple-600"
                  aria-hidden="true"
                />
                {t("orders.detail.itemsTitle", "Order Items")}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto pt-0">
              <Table className="min-w-[640px]">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>
                      {t("orders.table.product", "Product")}
                    </TableHead>
                    <TableHead className="w-[80px] text-center">
                      {t("orders.table.qty", "Qty")}
                    </TableHead>
                    <TableHead className="w-[140px] text-right">
                      {t("orders.detail.unitPrice", "Unit Price")}
                    </TableHead>
                    <TableHead className="w-[140px] text-right">
                      {t("orders.detail.lineTotal", "Line Total")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        {t("orders.detail.noItems", "No items in this order.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    order.items.map((item) => {
                      const image = getImageUrl(item.productImage);
                      return (
                        <TableRow
                          key={item.id}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {image ? (
                                <img
                                  src={image}
                                  alt={item.productName}
                                  className="h-12 w-12 rounded-md border object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                                  <Package
                                    className="h-5 w-5 text-muted-foreground"
                                    aria-hidden="true"
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {item.productName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.quantity} ×{" "}
                                  {formatMoney(item.unitPrice)}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatMoney(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">
                            {formatMoney(item.totalPrice)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4 min-[880px]:sticky min-[880px]:top-20">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin
                  className="h-4 w-4 text-purple-600"
                  aria-hidden="true"
                />
                {t("orders.detail.shippingTitle", "Shipping Address")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {address.length > 0 ? (
                <address className="text-sm not-italic leading-relaxed text-foreground">
                  {address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "orders.detail.noAddress",
                    "Shipping address is not available for this order.",
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard
                  className="h-4 w-4 text-purple-600"
                  aria-hidden="true"
                />
                {t("orders.detail.paymentTitle", "Payment")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("orders.detail.paymentMethod", "Payment Method")}
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {paymentMethodLabel(order.paymentMethod)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("orders.detail.paymentStatus", "Payment Status")}
                </p>
                <div className="mt-1">
                  <PaymentBadge status={order.paymentStatus} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt
                  className="h-4 w-4 text-purple-600"
                  aria-hidden="true"
                />
                {t("orders.detail.totalsTitle", "Order Summary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("orders.detail.subtotal", "Subtotal")}
                </span>
                <span className="font-medium">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {order.couponCode
                    ? t(
                        "orders.detail.discountWithCoupon",
                        "Discount ({{code}})",
                        { code: order.couponCode },
                      )
                    : t("orders.detail.discount", "Discount")}
                </span>
                <span className="font-medium text-emerald-600">
                  -{formatMoney(order.discountAmount)}
                </span>
              </div>
              <div className="my-2 h-px bg-border" />
              <div className="flex items-center justify-between text-base">
                <span className="font-semibold text-foreground">
                  {t("orders.detail.total", "Total")}
                </span>
                <span className="text-lg font-bold text-foreground">
                  {formatMoney(order.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
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

      <div className="flex justify-end">
        <Button asChild className="w-full gap-2 sm:w-auto">
          <Link to="/buyer/search">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("orders.detail.buyAgain", "Buy Again")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function BuyerOrderDetailPage() {
  return <BuyerOrderDetailContent />;
}
