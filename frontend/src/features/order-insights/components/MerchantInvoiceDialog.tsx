import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PaymentBadge } from './PaymentBadge';
import { formatCurrencyAmount } from '../types/merchantOrderInsights.types';
import type { MerchantOrderDetailDto } from '../types/merchantOrderFulfillment.types';
import {
  buildMerchantInvoiceData,
  formatInvoiceDate,
  merchantInvoiceLabels,
  printMerchantInvoice,
} from '../utils/merchantInvoice';

interface MerchantInvoiceDialogProps {
  /** The already-loaded order detail — the invoice never fetches anything itself. */
  order: MerchantOrderDetailDto;
  /** Cancel, the X, Escape and a click on the dimmed backdrop all land here. */
  onClose: () => void;
}

/**
 * The merchant's own copy of an order as an invoice, kept out of the order
 * detail layout so that page stays focused on processing the order.
 *
 * Everything shown comes from the order detail already on screen (the DTO the
 * page fetched) — no extra request, no backend or API change, and nothing the
 * DTO does not contain is invented. Payment is only ever described as paid when
 * the DTO says `completed`; a `pending` payment is labelled PENDING and carries
 * an explicit note that the order is not a payment receipt yet (BR-OI-007 keeps
 * this screen read-only: no status, payment or commission change is offered).
 *
 * Print and Download PDF hand the same print-ready document to the browser's
 * print dialog, where "Save as PDF" produces the download — so no PDF library is
 * added to the project.
 */
export function MerchantInvoiceDialog({ order, onClose }: MerchantInvoiceDialogProps) {
  const { t, i18n } = useTranslation();
  const translate = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const labels = merchantInvoiceLabels(translate);
  const locale = i18n.resolvedLanguage || i18n.language || 'en-US';
  // Memoised on the order so the "generated on" stamp stays stable while the
  // dialog is open, and so the preview and the printed file carry the same one.
  const data = useMemo(() => buildMerchantInvoiceData(order), [order]);

  const handlePrint = () => {
    if (!printMerchantInvoice(data, labels, locale)) {
      toast.error(labels.popupBlocked);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{`${labels.title} · ${data.reference}`}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 rounded-xl border border-[#f3f4f6] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:p-6">
          <div className="flex flex-col gap-4 border-b-2 border-[#7c3aed] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="m-0 text-xl font-extrabold tracking-[1px] text-[#7c3aed]">{labels.heading}</p>
              <dl className="mt-2 space-y-0.5 text-[12.5px] text-[#6b7280]">
                <div className="flex flex-wrap gap-1">
                  <dt>{`${labels.orderNumber}:`}</dt>
                  <dd className="m-0 font-semibold text-[#111827]">{data.reference}</dd>
                </div>
                <div className="flex flex-wrap gap-1">
                  <dt>{`${labels.orderDate}:`}</dt>
                  <dd className="m-0">{formatInvoiceDate(data.orderDate, locale)}</dd>
                </div>
                <div className="flex flex-wrap gap-1">
                  <dt>{`${labels.issueDate}:`}</dt>
                  <dd className="m-0">{formatInvoiceDate(data.issueDate, locale)}</dd>
                </div>
                <div className="flex flex-wrap gap-1">
                  <dt>{`${labels.orderStatus}:`}</dt>
                  <dd className="m-0">{data.statusLabel}</dd>
                </div>
              </dl>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="m-0 text-[13px] font-bold text-[#111827]">{data.sellerName}</p>
              <p className="m-0 text-[12px] text-[#6b7280]">{labels.sellerFulfillmentNote}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <h3 className="m-0 text-[13px] font-bold text-[#111827]">{labels.billedTo}</h3>
              <div className="mt-2 space-y-0.5 text-[12.5px] text-[#374151]">
                <p className="m-0 font-medium">{data.customer.name}</p>
                {data.customer.email && <p className="m-0 break-all">{data.customer.email}</p>}
                {data.customer.phone && <p className="m-0">{data.customer.phone}</p>}
              </div>
            </section>
            <section>
              <h3 className="m-0 text-[13px] font-bold text-[#111827]">{labels.shippingAddress}</h3>
              <div className="mt-2 space-y-0.5 text-[12.5px] text-[#374151]">
                {data.shippingAddressLines.length > 0 ? (
                  data.shippingAddressLines.map((line) => (
                    <p key={line} className="m-0 break-words">
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="m-0 text-[#6b7280]">{labels.addressUnavailable}</p>
                )}
              </div>
            </section>
          </div>

          <section>
            <h3 className="m-0 text-[13px] font-bold text-[#111827]">{labels.itemsTitle}</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#e5e7eb] text-[10px] uppercase tracking-wide text-[#9ca3af]">
                    <th scope="col" className="py-2 pr-2 text-left font-semibold">
                      {labels.columnProduct}
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">
                      {labels.columnQuantity}
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">
                      {labels.columnUnitPrice}
                    </th>
                    <th scope="col" className="py-2 pl-2 text-right font-semibold">
                      {labels.columnLineTotal}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[#6b7280]">
                        {labels.noItems}
                      </td>
                    </tr>
                  ) : (
                    data.lines.map((line) => (
                      <tr key={line.id} className="border-b border-[#f3f4f6] align-top">
                        <td className="break-words py-2.5 pr-2 font-medium text-[#111827]">{line.name}</td>
                        <td className="px-2 py-2.5 text-right text-[#374151]">{line.quantity}</td>
                        <td className="px-2 py-2.5 text-right text-[#374151]">
                          {formatCurrencyAmount(line.unitPrice)}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-semibold text-[#111827]">
                          {formatCurrencyAmount(line.lineTotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ml-auto w-full max-w-[320px] space-y-1 text-[13px]">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#6b7280]">{labels.subtotal}</span>
              <span className="font-medium text-[#111827]">{formatCurrencyAmount(data.subtotal)}</span>
            </div>
            {data.hasDiscount && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#6b7280]">{labels.discount}</span>
                <span className="font-medium text-[#10b981]">-{formatCurrencyAmount(data.discountAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 border-t-2 border-[#e5e7eb] pt-2">
              <span className="text-base font-bold text-[#111827]">{labels.total}</span>
              <span className="text-lg font-extrabold text-[#7c3aed]">
                {formatCurrencyAmount(data.totalAmount)}
              </span>
            </div>
          </section>

          <section className="space-y-2 rounded-lg border border-[#f3f4f6] bg-[#fafafa] p-4">
            <h3 className="m-0 text-[13px] font-bold text-[#111827]">{labels.paymentTitle}</h3>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="text-[#6b7280]">{labels.paymentMethod}</span>
              <span className="font-medium text-[#111827]">
                {data.paymentMethodLabel || labels.paymentUnavailable}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="text-[#6b7280]">{labels.paymentStatus}</span>
              <PaymentBadge status={data.paymentStatus} />
            </div>
            <p
              className={`m-0 rounded-md border-l-4 px-3 py-2 text-[12.5px] ${
                data.isPaymentPending
                  ? 'border-[#f59e0b] bg-[#fffbeb] text-[#92400e]'
                  : 'border-[#10b981] bg-[#ecfdf5] text-[#047857]'
              }`}
            >
              {data.isPaymentPending ? labels.paymentPendingNotice : labels.paymentReceivedNotice}
            </p>
          </section>
        </div>

        <DialogFooter className="gap-2">
          <p className="m-0 w-full text-[11.5px] leading-snug text-[#6b7280] sm:mr-auto sm:max-w-[280px] sm:text-left">
            {labels.printHint}
          </p>
          <Button type="button" variant="outline" onClick={onClose}>
            {labels.closeAction}
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            {labels.printAction}
          </Button>
          <Button
            type="button"
            className="gap-2 bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:opacity-90"
            onClick={handlePrint}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {labels.downloadAction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
