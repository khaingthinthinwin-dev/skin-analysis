import { toast } from "sonner";
import type {
  OrderDetailResponseDto,
  OrderShippingAddress,
} from "../types/orderInsights.types";

const PURPLE = "#7c3aed";

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function formatMoney(value: string): string {
  return `$${parseFloat(value).toFixed(2)}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function printInvoice(order: OrderDetailResponseDto): void {
  const newWindow = window.open("", "_blank");

  if (!newWindow) {
    toast.error("Please allow popups to download the invoice");
    return;
  }

  const reference = orderReference(order);
  const invoiceDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const subtotal = order.items
    .reduce((sum, item) => sum + parseFloat(item.totalPrice), 0)
    .toFixed(2);
  const address = addressLines(order.shippingAddress)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
  const items = order.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.productName)}</td>
          <td>${item.quantity}</td>
          <td>${formatMoney(item.unitPrice)}</td>
          <td>${formatMoney(item.totalPrice)}</td>
        </tr>`,
    )
    .join("");
  const discount = parseFloat(order.discountAmount);
  const discountLabel = order.couponCode
    ? `Discount (${escapeHtml(order.couponCode)})`
    : "Discount";
  const paymentStatus = String(order.paymentStatus).toLowerCase();
  const paymentLabel =
    paymentStatus === "completed"
      ? "✅ Paid"
      : paymentStatus === "pending"
        ? "⏳ Payment pending"
        : paymentStatus === "failed"
          ? "❌ Payment failed"
          : "—";
  const paymentStatusClass =
    paymentStatus === "completed"
      ? "payment-status-paid"
      : paymentStatus === "pending"
        ? "payment-status-pending"
        : paymentStatus === "failed"
          ? "payment-status-failed"
          : "payment-status-unknown";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Invoice ${escapeHtml(reference)}</title>
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      body {
        color: #111827;
        font-family: Arial, Helvetica, sans-serif;
        line-height: 1.5;
        margin: 0;
        padding: 48px;
      }
      .invoice { max-width: 760px; margin: 0 auto; }
      .header {
        align-items: flex-start;
        border-bottom: 3px solid ${PURPLE};
        display: flex;
        justify-content: space-between;
        padding-bottom: 24px;
      }
      h1 { color: ${PURPLE}; font-size: 34px; letter-spacing: 1px; margin: 0; }
      h2 { color: #111827; font-size: 16px; margin: 0 0 12px; }
      .meta { color: #6b7280; font-size: 13px; margin-top: 8px; }
      .brand { text-align: right; }
      .brand-name { color: ${PURPLE}; font-size: 17px; font-weight: 700; }
      .tagline { color: #6b7280; font-size: 12px; }
      section { margin-top: 28px; }
      .address { color: #374151; font-size: 14px; }
      table { border-collapse: collapse; margin-top: 8px; width: 100%; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 12px 8px; text-align: left; }
      th { color: #6b7280; font-size: 11px; letter-spacing: .4px; text-transform: uppercase; }
      td { font-size: 13px; }
      th:not(:first-child), td:not(:first-child) { text-align: right; }
      .summary { margin-left: auto; margin-top: 18px; max-width: 300px; }
      .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
      .summary-label { color: #6b7280; }
      .discount { color: #10b981; }
      .total { border-top: 2px solid #e5e7eb; color: ${PURPLE}; font-size: 17px; font-weight: 700; margin-top: 8px; padding-top: 10px; }
      .payment { color: #374151; font-size: 14px; }
      .payment-status { font-weight: 700; margin-top: 4px; }
      .payment-status-paid { color: #10b981; }
      .payment-status-pending { color: #f59e0b; }
      .payment-status-failed { color: #ef4444; }
      .payment-status-unknown { color: #6b7280; }
      footer { border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; margin-top: 44px; padding-top: 18px; text-align: center; }
      @media print {
        body { padding: 0; }
        .no-print { display: none !important; }
      }
    </style>
  </head>
  <body>
    <main class="invoice">
      <header class="header">
        <div>
          <h1>INVOICE</h1>
          <div class="meta">Order ${escapeHtml(reference)}</div>
          <div class="meta">Order Date: ${escapeHtml(formatDate(order.createdAt))}</div>
          <div class="meta">Invoice Date: ${escapeHtml(invoiceDate)}</div>
        </div>
        <div class="brand">
          <div class="brand-name">Cosmetics Finder</div>
          <div class="tagline">Discover your best beauty match</div>
        </div>
      </header>

      <section>
        <h2>Shipping Address</h2>
        <div class="address">${address || "Not available"}</div>
      </section>

      <section>
        <h2>Order Items</h2>
        <table>
          <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
          <tbody>${items || '<tr><td colspan="4">No items in this order.</td></tr>'}</tbody>
        </table>
      </section>

      <section>
        <div class="summary">
          <div class="summary-row"><span class="summary-label">Subtotal</span><span>${formatMoney(subtotal)}</span></div>
          <div class="summary-row discount"><span>${discountLabel}</span><span>${discount > 0 ? `-${formatMoney(order.discountAmount)}` : formatMoney(order.discountAmount)}</span></div>
          <div class="summary-row total"><span>Total</span><span>${formatMoney(order.totalAmount)}</span></div>
        </div>
      </section>

      <section>
        <h2>Payment</h2>
        <div class="payment">Method: ${escapeHtml(paymentMethodLabel(order.paymentMethod))}</div>
        <div class="payment payment-status ${paymentStatusClass}">${paymentLabel}</div>
      </section>

      <footer>Thank you for shopping with Cosmetics Finder</footer>
    </main>
  </body>
</html>`;

  newWindow.document.write(html);
  newWindow.document.close();
  newWindow.focus();
  newWindow.setTimeout(() => newWindow.print(), 250);
}
