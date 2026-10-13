import type { AdminOrderDetailDto, AdminOrderTimelineEntryDto } from '../types/adminOrderInsights.types';
import { formatCurrencyAmount } from '../types/merchantOrderInsights.types';

const PURPLE = '#7c3aed';

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character];
  });
}

/**
 * Every money figure on the slip goes through the app-wide Ks formatter
 * (`formatCurrencyAmount`) so the PDF matches the detail screen and the backend
 * export — e.g. 12000 -> "12,000 Ks".
 */
function formatMoney(value: string | number): string {
  return formatCurrencyAmount(value);
}

function formatDateTime(value: string, locale: string): string {
  return new Date(value).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function titleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function addressLines(order: AdminOrderDetailDto): string[] {
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

/**
 * The status history is an admin-only view of who moved the order and when, so it
 * is rendered oldest-first as the change log it is. Missing entries are simply
 * omitted — the detail screen already handles the "no history" case.
 */
function historyRows(timeline: AdminOrderTimelineEntryDto[], locale: string): string {
  return timeline
    .map((entry) => {
      const actor = entry.changedBy?.trim();
      const note = entry.note?.trim();
      return `
        <tr>
          <td>${escapeHtml(entry.statusName ?? titleCase(entry.status))}</td>
          <td>${escapeHtml(formatDateTime(entry.createdAt, locale))}</td>
          <td>${escapeHtml(actor || '—')}</td>
          <td>${escapeHtml(note || '—')}</td>
        </tr>`;
    })
    .join('');
}

export function buildAdminOrderPrintHtml(order: AdminOrderDetailDto, locale = 'en-US'): string {
  const subtotal = order.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const discount = Number(order.discountAmount);
  const address = addressLines(order).map((line) => `<div>${escapeHtml(line)}</div>`).join('');
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
    .join('');
  const discountLabel = order.couponCode ? `Discount (${escapeHtml(order.couponCode)})` : 'Discount';
  const vouchers = (order.voucherCodes ?? [])
    .map((voucher) => `<div>${escapeHtml(voucher.code)} &minus; ${formatMoney(voucher.discountAmount)}</div>`)
    .join('');
  const timeline = order.timeline ?? [];
  const printedAt = new Date().toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Order ${escapeHtml(order.orderNumber)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body {
        background: #f3f4f6;
        color: #111827;
        font-family: Arial, Helvetica, sans-serif;
        line-height: 1.5;
        margin: 0;
        padding: 24px;
      }
      .sheet { background: #fff; margin: 0 auto; max-width: 780px; padding: 40px; }
      .toolbar {
        background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
        display: flex; gap: 12px; justify-content: space-between; margin: 0 auto 16px;
        max-width: 780px; padding: 12px 16px;
      }
      .toolbar p { color: #6b7280; font-size: 13px; margin: 0; }
      .toolbar button {
        background: ${PURPLE}; border: 0; border-radius: 6px; color: #fff;
        cursor: pointer; font-size: 13px; font-weight: 700; padding: 9px 16px;
      }
      .header {
        align-items: flex-start; border-bottom: 3px solid ${PURPLE};
        display: flex; justify-content: space-between; padding-bottom: 20px;
      }
      h1 { color: ${PURPLE}; font-size: 28px; letter-spacing: 1px; margin: 0; }
      h2 { color: #111827; font-size: 13px; letter-spacing: .6px; margin: 0 0 8px; text-transform: uppercase; }
      .meta { color: #6b7280; font-size: 12.5px; margin-top: 4px; }
      .status { color: #111827; font-size: 13px; margin-top: 10px; }
      .pill {
        background: #f3f0ff; border: 1px solid #ddd6fe; border-radius: 999px;
        color: ${PURPLE}; display: inline-block; font-size: 11px; font-weight: 700;
        letter-spacing: .5px; padding: 3px 10px; text-transform: uppercase;
      }
      .brand { text-align: right; }
      .brand-name { color: ${PURPLE}; font-size: 15px; font-weight: 700; }
      .brand-note { color: #6b7280; font-size: 11.5px; }
      section { margin-top: 24px; }
      .grid { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .info-card {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 14px 16px;
        break-inside: avoid;
        page-break-inside: avoid;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .info-card .kv dt { color: #111827; font-weight: 700; }
      .info-card .kv dd { font-weight: 400; min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
      .address, dl { color: #374151; font-size: 13px; }
      .kv { display: flex; justify-content: space-between; gap: 12px; padding: 3px 0; }
      .kv dt { color: #6b7280; }
      .kv dd { font-weight: 600; margin: 0; text-align: right; word-break: break-word; }
      table { border-collapse: collapse; margin-top: 8px; width: 100%; }
      th, td { border-bottom: 1px solid #e5e7eb; font-size: 12.5px; padding: 10px 8px; text-align: left; }
      th { color: #6b7280; font-size: 10.5px; letter-spacing: .4px; text-transform: uppercase; }
      td.num, th.num { text-align: right; }
      tbody tr:last-child td { border-bottom: 0; }
      .summary { margin-left: auto; margin-top: 14px; max-width: 320px; }
      .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
      .summary-label { color: #6b7280; }
      .discount { color: #059669; }
      .total { border-top: 2px solid #e5e7eb; color: ${PURPLE}; font-size: 17px; font-weight: 700; margin-top: 6px; padding-top: 10px; }
      .note { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; color: #374151; font-size: 13px; padding: 12px 14px; white-space: pre-line; }
      footer { border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11.5px; margin-top: 32px; padding-top: 14px; }
      @media print {
        body { background: #fff; padding: 0; }
        .toolbar { display: none; }
        .sheet { max-width: none; padding: 0; }
        /* Trim decorative spacing for print only so a small order stays on one A4 page. */
        .header { padding-bottom: 14px; }
        section { margin-top: 14px; }
        footer { margin-top: 16px; padding-top: 10px; break-inside: avoid; }
        /* Keep rows and headings whole when a longer order does flow onto a second page. */
        tr { break-inside: avoid; }
        h2 { break-after: avoid; page-break-after: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <p>Use your browser's print dialog &mdash; choose &ldquo;Save as PDF&rdquo; to keep a copy.</p>
      <button type="button" onclick="window.print()">Print</button>
    </div>

    <main class="sheet">
      <header class="header">
        <div>
          <h1>ORDER DETAILS</h1>
          <div class="meta">Order ${escapeHtml(order.orderNumber)}</div>
          <div class="meta">Placed ${escapeHtml(formatDateTime(order.createdAt, locale))}</div>
          <div class="status"><span class="pill">${escapeHtml(order.statusName ?? titleCase(order.status))}</span></div>
        </div>
        <div class="brand">
          <div class="brand-name">Cosmetics Finder</div>
          <div class="brand-note">Platform administration</div>
          <div class="brand-note">Admin copy &mdash; read only</div>
        </div>
      </header>

      <section class="grid">
        <div class="info-card">
          <h2>Shop / Merchant</h2>
          <dl>
            <div class="kv"><dt>Shop</dt><dd>${escapeHtml(order.shop.name)}</dd></div>
            ${order.shop.merchantName ? `<div class="kv"><dt>Merchant contact</dt><dd>${escapeHtml(order.shop.merchantName)}</dd></div>` : ''}
            ${order.shop.merchantId ? `<div class="kv"><dt>Merchant ID</dt><dd>${escapeHtml(order.shop.merchantId)}</dd></div>` : ''}
          </dl>
        </div>
        <div class="info-card">
          <h2>Customer</h2>
          <dl>
            <div class="kv"><dt>Name</dt><dd>${escapeHtml(order.customer.name)}</dd></div>
            <div class="kv"><dt>Email</dt><dd>${escapeHtml(order.customer.email)}</dd></div>
            ${order.customer.phone ? `<div class="kv"><dt>Phone</dt><dd>${escapeHtml(order.customer.phone)}</dd></div>` : ''}
          </dl>
        </div>
      </section>

      <section>
        <h2>Shipping Address</h2>
        <div class="address">${address || 'Not available'}</div>
      </section>

      <section>
        <h2>Order Items</h2>
        <table>
          <thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Line Total</th></tr></thead>
          <tbody>${items || '<tr><td colspan="4">No items in this order.</td></tr>'}</tbody>
        </table>
      </section>

      <section>
        <div class="summary">
          <div class="summary-row"><span class="summary-label">Subtotal</span><span>${formatMoney(subtotal.toFixed(2))}</span></div>
          ${vouchers ? `<div class="summary-row discount"><span class="summary-label">Vouchers</span><span class="discount">${vouchers}</span></div>` : ''}
          <div class="summary-row discount"><span class="summary-label">${discountLabel}</span><span>${discount > 0 ? `&minus;${formatMoney(order.discountAmount)}` : formatMoney(order.discountAmount)}</span></div>
          <div class="summary-row total"><span>Total</span><span>${formatMoney(order.totalAmount)}</span></div>
        </div>
      </section>

      <section>
        <h2>Payment</h2>
        <dl>
          <div class="kv"><dt>Method</dt><dd>${escapeHtml(titleCase(order.paymentMethod))}</dd></div>
          <div class="kv"><dt>Status</dt><dd>${escapeHtml(titleCase(order.paymentStatus))}</dd></div>
        </dl>
      </section>

      ${order.notes ? `<section><h2>Order Note</h2><div class="note">${escapeHtml(order.notes)}</div></section>` : ''}

      ${
        timeline.length > 0
          ? `<section>
              <h2>Status History</h2>
              <table>
                <thead><tr><th>Status</th><th>When</th><th>Changed by</th><th>Note</th></tr></thead>
                <tbody>${historyRows(timeline, locale)}</tbody>
              </table>
            </section>`
          : ''
      }

      <footer>Printed ${escapeHtml(printedAt)} &middot; Cosmetics Finder admin order summary. This copy is read-only and is not a payment receipt.</footer>
    </main>
  </body>
</html>`;
}

/**
 * Hands the admin order summary to the browser's print dialog, where "Save as
 * PDF" produces the file — so no PDF library is added to the project.
 *
 * The document is written into its own window with its own stylesheet instead of
 * printing the app page, which keeps every print rule out of the running
 * application: the buyer and merchant invoice/print screens keep their own
 * styling and cannot be affected by this one.
 *
 * @returns `false` when the browser blocked the pop-up, so the caller can say so.
 */
export function printAdminOrder(order: AdminOrderDetailDto, locale = 'en-US'): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.write(buildAdminOrderPrintHtml(order, locale));
  printWindow.document.close();
  printWindow.focus();
  // Let the new document lay out before the dialog opens.
  printWindow.setTimeout(() => printWindow.print(), 250);
  return true;
}