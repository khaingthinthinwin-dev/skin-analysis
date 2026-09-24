/**
 * Per-order commission figures for the merchant order detail page.
 *
 * `MerchantOrderDetailDto` carries no commission/payout fields, so the detail
 * page derives them from the SAME documented rule the backend Revenue Summary
 * aggregates with (`backend/src/modules/shared/order-insights/merchant-summary
 * .service.ts`, BR-OI-022/028 — DD_Order_Insights_05 §4.2):
 *
 *   commission = round_half_up(total_amount × rate%, 2)   (per order, BR-OI-028)
 *   net        = total_amount − commission                (BR-OI-024)
 *
 * `totalAmount` must be `orders.total_amount`, i.e. the order total AFTER the
 * discount (backend `orders.service.ts` computes
 * `totalAmount = Math.max(subtotal - discountAmount, 0)`), so the platform
 * commission base is the discounted total — the same base the Revenue Summary
 * sums. Keep this the single frontend implementation so the detail figure can
 * never drift from the summary card.
 */
export interface OrderCommissionFigures {
  /** Commission as a plain decimal string, e.g. "4224.00". */
  commission: string;
  /** What the merchant receives: total − commission, e.g. "30976.00". */
  net: string;
}

/**
 * Mirrors the backend per-order commission calculation for one order.
 * Returns `null` when either input is not numeric so callers can hide the
 * block instead of inventing figures.
 */
export function computeOrderCommission(
  totalAmount: string,
  commissionRate: string,
): OrderCommissionFigures | null {
  const total = Number(totalAmount);
  const rate = Number(commissionRate);
  if (!Number.isFinite(total) || !Number.isFinite(rate)) return null;

  // `+ 1e-9` keeps exact half values (e.g. 1.245 → 1.25) on the half-up side
  // despite binary floating-point error; the nudge is far below any other
  // rounding boundary for these small money values.
  const raw = (total * rate) / 100;
  const commission = Math.round((raw + 1e-9) * 100) / 100;
  const net = Math.round((total - commission) * 100) / 100;
  return { commission: commission.toFixed(2), net: net.toFixed(2) };
}