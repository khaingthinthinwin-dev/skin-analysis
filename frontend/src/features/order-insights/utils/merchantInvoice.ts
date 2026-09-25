import { formatCurrencyAmount } from '../types/merchantOrderInsights.types';
import type { PaymentStatus, OrderShippingAddress } from '../types/orderInsights.types';
import type { MerchantOrderDetailDto } from '../types/merchantOrderFulfillment.types';
import { formatStatusLabel } from './orderStatusLabel';

/**
 * Storefront printed as the invoice issuer. The merchant order detail DTO
 * (`merchant-order-detail-response.dto.ts`) exposes no shop name, so the invoice
 * cannot name the individual shop without inventing data or calling an endpoint
 * this screen does not own — it names the marketplace the order was sold on and
 * states that the order is fulfilled by the merchant's own shop.
 */
const INVOICE_SELLER_NAME = 'Cosmetics Finder';

const PURPLE = '#7c3aed';

/** One invoice line — the item fields the order detail DTO really returns. */
export interface MerchantInvoiceLine {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

/** Everything the invoice view and the printed document render. */
export interface MerchantInvoiceData {
  /** Order reference (the order number, or `#XXXXXXXX` when it is missing). */
  reference: string;
  /** ISO timestamp the order was placed. */
  orderDate: string;
  /** ISO timestamp the invoice was generated (now). */
  issueDate: string;
  /** Human readable order status (e.g. "Out For Delivery"). */
  statusLabel: string;
  sellerName: string;
  customer: { name: string; email: string; phone: string | null };
  shippingAddressLines: string[];
  lines: MerchantInvoiceLine[];
  /** Sum of the line totals — the DTO returns no subtotal field. */
  subtotal: string;
  discountAmount: string;
  hasDiscount: boolean;
  totalAmount: string;
  /** Blank when the DTO carries no usable payment method. */
  paymentMethodLabel: string;
  paymentStatus: PaymentStatus;
  /** True only for `completed`; anything else counts as not collected yet. */
  isPaymentPaid: boolean;
  /** `!isPaymentPaid` — drives the PENDING emphasis, so a receipt is never implied. */
  isPaymentPending: boolean;
}

/**
 * Every string the invoice shows. Both renderers (the React preview and the
 * printable HTML document) read this one object, so a label can never drift
 * between the view and the file the merchant prints or saves as PDF.
 */
export interface MerchantInvoiceLabels {
  title: string;
  heading: string;
  description: string;
  orderNumber: string;
  orderDate: string;
  issueDate: string;
  orderStatus: string;
  seller: string;
  sellerFulfillmentNote: string;
  billedTo: string;
  shippingAddress: string;
  addressUnavailable: string;
  itemsTitle: string;
  noItems: string;
  columnProduct: string;
  columnQuantity: string;
  columnUnitPrice: string;
  columnLineTotal: string;
  subtotal: string;
  discount: string;
  total: string;
  paymentTitle: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentStatusPaid: string;
  paymentStatusPending: string;
  paymentPendingNotice: string;
  paymentReceivedNotice: string;
  paymentUnavailable: string;
  generatedOn: string;
  footer: string;
  printAction: string;
  downloadAction: string;
  printHint: string;
  popupBlocked: string;
  closeAction: string;
}

/** Shape of the `translate` helper the order insights pages already use. */
export type MerchantInvoiceTranslate = (key: string, fallback: string) => string;


/**
 * Builds the invoice text once, from the module's usual `t(key, fallback)`
 * translation helper. All keys live under `merchant.orders.invoice.*`; a missing
 * locale entry falls back to the English default, exactly like the rest of the
 * merchant order screens.
 */
export function merchantInvoiceLabels(translate: MerchantInvoiceTranslate): MerchantInvoiceLabels {
  return {
    title: translate('merchant.orders.invoice.title', 'Invoice'),
    heading: translate('merchant.orders.invoice.heading', 'INVOICE'),
    description: translate(
      'merchant.orders.invoice.description',
      'Review this invoice, then print it or save it as a PDF.',
    ),
    orderNumber: translate('merchant.orders.invoice.orderNumber', 'Order number'),
    orderDate: translate('merchant.orders.invoice.orderDate', 'Order date'),
    issueDate: translate('merchant.orders.invoice.issueDate', 'Invoice date'),
    orderStatus: translate('merchant.orders.invoice.orderStatus', 'Order status'),
    seller: translate('merchant.orders.invoice.seller', 'Seller'),
    sellerFulfillmentNote: translate(
      'merchant.orders.invoice.sellerFulfillmentNote',
      'Marketplace order fulfilled by your shop',
    ),
    billedTo: translate('merchant.orders.invoice.billedTo', 'Customer'),
    shippingAddress: translate('merchant.orders.invoice.shippingAddress', 'Shipping address'),
    addressUnavailable: translate(
      'merchant.orders.invoice.addressUnavailable',
      'Shipping address is not available for this order.',
    ),
    itemsTitle: translate('merchant.orders.invoice.itemsTitle', 'Order items'),
    noItems: translate('merchant.orders.invoice.noItems', 'No items in this order.'),
    columnProduct: translate('merchant.orders.invoice.columnProduct', 'Product'),
    columnQuantity: translate('merchant.orders.invoice.columnQuantity', 'Qty'),
    columnUnitPrice: translate('merchant.orders.invoice.columnUnitPrice', 'Unit price'),
    columnLineTotal: translate('merchant.orders.invoice.columnLineTotal', 'Line total'),
    subtotal: translate('orders.detail.subtotal', 'Subtotal'),
    discount: translate('orders.detail.discount', 'Discount'),
    total: translate('orders.detail.total', 'Total'),
    paymentTitle: translate('orders.detail.paymentTitle', 'Payment'),
    paymentMethod: translate('merchant.orders.invoice.paymentMethod', 'Payment method'),
    paymentStatus: translate('merchant.orders.invoice.paymentStatus', 'Payment status'),
    paymentStatusPaid: translate('merchant.orders.invoice.paymentStatusPaid', 'PAID'),
    paymentStatusPending: translate('merchant.orders.invoice.paymentStatusPending', 'PENDING'),
    paymentPendingNotice: translate(
      'merchant.orders.invoice.paymentPendingNotice',
      'Payment is still PENDING: no payment has been collected for this order yet, so this document is not a payment receipt.',
    ),
    paymentReceivedNotice: translate(
      'merchant.orders.invoice.paymentReceivedNotice',
      'Payment for this order has been collected.',
    ),
    paymentUnavailable: translate('merchant.orders.invoice.paymentUnavailable', 'Not available'),
    generatedOn: translate('merchant.orders.invoice.generatedOn', 'Generated on'),
    footer: translate(
      'merchant.orders.invoice.footer',
      'This invoice was generated from the order record on Cosmetics Finder.',
    ),
    printAction: translate('merchant.orders.invoice.print', 'Print'),
    downloadAction: translate('merchant.orders.invoice.downloadPdf', 'Download PDF'),
    printHint: translate(
      'merchant.orders.invoice.printHint',
      'Print and Download PDF both open your browser print dialog — choose "Save as PDF" as the destination to download a copy.',
    ),
    popupBlocked: translate(
      'merchant.orders.invoice.popupBlocked',
      'Please allow pop-ups to print or save this invoice.',
    ),
    closeAction: translate('merchant.orders.invoice.close', 'Close'),
  };
}


/** How the invoice prints dates — e.g. "September 1, 2026". */
export function formatInvoiceDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Title-cases a DTO enum value ("cash_on_delivery" -> "Cash On Delivery"). */
function paymentMethodLabel(method: string): string {
  return method.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/** The address in reading order; blank/missing fields are dropped. */
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

/** Sums decimal strings into a 2-decimal string; unparsable values count as 0. */
function sumAmounts(values: string[]): string {
  const total = values.reduce((sum, value) => {
    const amount = parseFloat(value);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
  return total.toFixed(2);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

/**
 * Projects the order detail DTO onto the invoice. Only fields the detail
 * endpoint really returns are used — no shop, tax or payment-transaction data is
 * invented — and the commission the order page shows is deliberately left out:
 * an invoice goes to the customer and states what the customer owes, not the
 * platform's cut of it.
 */
export function buildMerchantInvoiceData(
  order: MerchantOrderDetailDto,
  now: Date = new Date(),
): MerchantInvoiceData {
  const discount = parseFloat(order.discountAmount);
  const hasDiscount = Number.isFinite(discount) && discount > 0;
  const isPaymentPaid = order.paymentStatus === 'completed';

  return {
    reference: order.orderNumber || `#${order.id.slice(0, 8).toUpperCase()}`,
    orderDate: order.createdAt,
    issueDate: now.toISOString(),
    statusLabel: order.statusName?.trim() || formatStatusLabel(order.status),
    sellerName: INVOICE_SELLER_NAME,
    customer: {
      name: order.customer.name,
      email: order.customer.email,
      phone: order.customer.phone,
    },
    shippingAddressLines: addressLines(order.shippingAddress),
    lines: order.items.map((item) => ({
      id: item.id,
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.totalPrice,
    })),
    subtotal: sumAmounts(order.items.map((item) => item.totalPrice)),
    discountAmount: order.discountAmount,
    hasDiscount,
    totalAmount: order.totalAmount,
    paymentMethodLabel: order.paymentMethod ? paymentMethodLabel(order.paymentMethod) : '',
    paymentStatus: order.paymentStatus,
    isPaymentPaid,
    isPaymentPending: !isPaymentPaid,
  };
}


/** Print-only stylesheet of the invoice document (A4, purple palette). */
const INVOICE_STYLES = `@page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      body { color: #111827; font-family: Arial, Helvetica, sans-serif; line-height: 1.5; margin: 0; padding: 48px; }
      .invoice { margin: 0 auto; max-width: 760px; }
      .header { align-items: flex-start; border-bottom: 3px solid ${PURPLE}; display: flex; justify-content: space-between; gap: 24px; padding-bottom: 24px; }
      h1 { color: ${PURPLE}; font-size: 34px; letter-spacing: 1px; margin: 0; }
      h2 { color: #111827; font-size: 15px; margin: 0 0 12px; }
      .meta { color: #6b7280; font-size: 13px; margin-top: 6px; }
      .meta strong { color: #111827; }
      .brand { text-align: right; }
      .brand-name { color: ${PURPLE}; font-size: 17px; font-weight: 700; }
      .tagline { color: #6b7280; font-size: 12px; }
      section { margin-top: 28px; }
      .parties { display: flex; gap: 32px; }
      .parties > div { flex: 1; }
      .address { color: #374151; font-size: 14px; }
      table { border-collapse: collapse; margin-top: 8px; width: 100%; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 12px 8px; text-align: left; }
      th { color: #6b7280; font-size: 11px; letter-spacing: .4px; text-transform: uppercase; }
      td { font-size: 13px; }
      th.num, td.num { text-align: right; }
      .summary { margin-left: auto; margin-top: 18px; max-width: 320px; }
      .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
      .summary-label { color: #6b7280; }
      .discount { color: #10b981; }
      .total { border-top: 2px solid #e5e7eb; color: ${PURPLE}; font-size: 17px; font-weight: 700; margin-top: 8px; padding-top: 10px; }
      .payment { color: #374151; font-size: 14px; }
      .payment-status { border-radius: 999px; display: inline-block; font-weight: 700; padding: 2px 10px; }
      .status-paid { background: #ecfdf5; color: #047857; }
      .status-pending { background: #fffbeb; color: #b45309; }
      .notice { background: #fffbeb; border-left: 4px solid #f59e0b; color: #92400e; font-size: 13px; margin-top: 12px; padding: 10px 12px; }
      footer { border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; margin-top: 44px; padding-top: 18px; text-align: center; }
      @media print { body { padding: 0; } }`;

/** Blank-line-safe block of escaped text lines. */
function textBlock(lines: string[]): string {
  return lines
    .filter((line) => Boolean(line))
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join('');
}


/**
 * The document the merchant prints or saves as a PDF: a self-contained A4 page
 * that reads correctly on its own (it is the customer's copy of the order), in
 * the same purple palette as the order detail screen. Every value is escaped —
 * product names and addresses are merchant/customer supplied text.
 */
export function buildMerchantInvoiceHtml(
  data: MerchantInvoiceData,
  labels: MerchantInvoiceLabels,
  locale = 'en-US',
): string {
  const money = (value: string) => escapeHtml(formatCurrencyAmount(value));
  const issuedOn = escapeHtml(formatInvoiceDate(data.issueDate, locale));
  const orderDate = escapeHtml(formatInvoiceDate(data.orderDate, locale));
  const statusLabel = data.isPaymentPaid ? labels.paymentStatusPaid : labels.paymentStatusPending;
  const items = data.lines.map(
    (line) => `
            <tr>
              <td>${escapeHtml(line.name)}</td>
              <td class="num">${line.quantity}</td>
              <td class="num">${money(line.unitPrice)}</td>
              <td class="num">${money(line.lineTotal)}</td>
            </tr>`,
  ).join('');

  return `<!doctype html>
<html lang="${escapeHtml(locale)}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(labels.title)} ${escapeHtml(data.reference)}</title>
    <style>${INVOICE_STYLES}</style>
  </head>
  <body>
    <main class="invoice">
      <header class="header">
        <div>
          <h1>${escapeHtml(labels.heading)}</h1>
          <div class="meta">${escapeHtml(labels.orderNumber)}: <strong>${escapeHtml(data.reference)}</strong></div>
          <div class="meta">${escapeHtml(labels.orderDate)}: ${orderDate}</div>
          <div class="meta">${escapeHtml(labels.issueDate)}: ${issuedOn}</div>
          <div class="meta">${escapeHtml(labels.orderStatus)}: ${escapeHtml(data.statusLabel)}</div>
        </div>
        <div class="brand">
          <div class="brand-name">${escapeHtml(data.sellerName)}</div>
          <div class="tagline">${escapeHtml(labels.sellerFulfillmentNote)}</div>
        </div>
      </header>

      <section class="parties">
        <div>
          <h2>${escapeHtml(labels.billedTo)}</h2>
          <div class="address">${textBlock([data.customer.name, data.customer.email, data.customer.phone ?? ''])}</div>
        </div>
        <div>
          <h2>${escapeHtml(labels.shippingAddress)}</h2>
          <div class="address">${textBlock(data.shippingAddressLines) || escapeHtml(labels.addressUnavailable)}</div>
        </div>
      </section>

      <section>
        <h2>${escapeHtml(labels.itemsTitle)}</h2>
        <table>
          <thead>
            <tr>
              <th>${escapeHtml(labels.columnProduct)}</th>
              <th class="num">${escapeHtml(labels.columnQuantity)}</th>
              <th class="num">${escapeHtml(labels.columnUnitPrice)}</th>
              <th class="num">${escapeHtml(labels.columnLineTotal)}</th>
            </tr>
          </thead>
          <tbody>${items || `<tr><td colspan="4">${escapeHtml(labels.noItems)}</td></tr>`}</tbody>
        </table>
      </section>

      <section>
        <div class="summary">
          <div class="summary-row"><span class="summary-label">${escapeHtml(labels.subtotal)}</span><span>${money(data.subtotal)}</span></div>
          ${data.hasDiscount ? `<div class="summary-row discount"><span>${escapeHtml(labels.discount)}</span><span>-${money(data.discountAmount)}</span></div>` : ''}
          <div class="summary-row total"><span>${escapeHtml(labels.total)}</span><span>${money(data.totalAmount)}</span></div>
        </div>
      </section>

      <section>
        <h2>${escapeHtml(labels.paymentTitle)}</h2>
        <div class="payment">${escapeHtml(labels.paymentMethod)}: ${escapeHtml(data.paymentMethodLabel || labels.paymentUnavailable)}</div>
        <div class="payment">${escapeHtml(labels.paymentStatus)}: <span class="payment-status ${data.isPaymentPaid ? 'status-paid' : 'status-pending'}">${escapeHtml(statusLabel)}</span></div>
        <div class="notice">${escapeHtml(data.isPaymentPending ? labels.paymentPendingNotice : labels.paymentReceivedNotice)}</div>
      </section>

      <footer>${escapeHtml(labels.footer)}<br>${escapeHtml(labels.generatedOn)} ${issuedOn}</footer>
    </main>
  </body>
</html>`;
}


/**
 * Opens the print-ready invoice in a new tab and hands it to the browser's own
 * print dialog, the same mechanism the buyer invoice already uses
 * (utils/printInvoice.ts). Returns false when the pop-up was blocked, so the
 * caller can tell the merchant in their own language.
 *
 * A PDF comes out of that same dialog ("Save as PDF" is one of its
 * destinations), which is why Print and Download PDF share this single path
 * instead of pulling in a PDF library the project does not depend on today.
 */
export function printMerchantInvoice(
  data: MerchantInvoiceData,
  labels: MerchantInvoiceLabels,
  locale = 'en-US',
): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return false;
  }

  printWindow.document.write(buildMerchantInvoiceHtml(data, labels, locale));
  printWindow.document.close();
  printWindow.focus();
  // Give the new document a moment to lay out before the dialog opens.
  printWindow.setTimeout(() => printWindow.print(), 250);
  return true;
}

