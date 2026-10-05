/**
 * Per-order commission figures and commission-rate rules for the merchant Order
 * Insights surfaces (the Revenue Summary card, the merchant order detail page and
 * the CSV export).
 *
 * `MerchantOrderDetailDto` carries no per-order commission amounts (and the rate
 * only once the API reports it), so the detail page derives them from the SAME
 * documented rule the backend Revenue Summary
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
 *
 * The module is also the single home of the rate rules the merchant surfaces
 * share: `normalizeCommissionRate`, `resolveOrderCommissionRate` (an order's own
 * stored rate before the current platform rate) and the "(current rate)" wording,
 * so the Revenue Summary card, the order detail block and the CSV export can
 * never disagree about which rate a figure was calculated with.
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

/**
 * The commission rate as a usable DECIMAL string, or null when it is missing,
 * empty or non-numeric — never a fake 0. The single home of that rule: the
 * Revenue Summary card, the merchant order detail block and the CSV export all
 * normalize a rate through here before showing or calculating with it.
 */
export function normalizeCommissionRate(rate: string | null | undefined): string | null {
  return rate !== null && rate !== undefined && rate !== '' && Number.isFinite(Number(rate)) ? rate : null;
}

/**
 * The rate that applies to ONE order: the rate stored on the order itself when
 * the API reports it (`orders.commission_rate`, the rate in force when the order
 * was placed) otherwise the current platform rate from the Revenue Summary — the
 * documented BR-OI-023 fallback. The rate is never derived from
 * commission ÷ order total, and an unusable value falls through to the platform
 * rate instead of being treated as a real rate.
 */
export function resolveOrderCommissionRate(
  orderRate: string | null | undefined,
  platformRate: string | null | undefined,
): string | null {
  return normalizeCommissionRate(orderRate) ?? normalizeCommissionRate(platformRate);
}

/**
 * The commission rate as a plain number for tabular output, e.g. "12" — the
 * column header already carries the `%`, exactly like the money columns carry
 * " (Ks)". `commissionRate` is a DECIMAL string, so insignificant trailing zeros
 * are dropped (12.00 -> 12, 10.50 -> 10.5). Returns null for a missing, empty or
 * non-numeric rate so callers render their own placeholder — never a fabricated
 * "0".
 */
export function formatCommissionRateValue(commissionRate: string | null | undefined): string | null {
  if (commissionRate === null || commissionRate === undefined || commissionRate === '') return null;
  const rate = Number(commissionRate);
  return Number.isFinite(rate) ? String(rate) : null;
}

/**
 * The commission rate as a percentage label, e.g. "12%". Same numeric rule as
 * formatCommissionRateValue; returns null for a missing/empty/non-numeric rate so
 * callers render their own placeholder — never a fabricated "0%".
 */
export function formatCommissionRatePercent(commissionRate: string | null | undefined): string | null {
  const value = formatCommissionRateValue(commissionRate);
  return value === null ? null : `${value}%`;
}

/**
 * Whether a surface must mark the rate it shows as the platform's CURRENT rate
 * (BR-OI-023): true while the rate is not locked to the order, false once the
 * rate is the order's own snapshot. The Revenue Summary footer, the order detail
 * block and the CSV header all decide the marker through here, so "current rate"
 * can never appear on one merchant surface and not another.
 */
export function needsCurrentRateMarker(commissionRateLocked: boolean): boolean {
  return !commissionRateLocked;
}

/**
 * The rate label every merchant surface shows, with the "(current rate)" marker
 * appended while the rate is NOT locked to the order. Single home of the wording
 * so the Revenue Summary footer, the order detail block and the CSV header can
 * never disagree about which rate was used.
 *
 * Why it still reads "current rate" on the Revenue Summary: that card aggregates
 * a period of orders that may have been charged different rates and hardcodes
 * `commissionRateSource: 'current_settings'` / `commissionRateLocked: false`
 * (BR-OI-023), so its figure really is the current platform rate. The merchant
 * order list and merchant order detail endpoints DO report each order's stored
 * rate, so those surfaces pass `true` and the marker drops on its own — no
 * wording change here.
 *
 * `currentRateMarker` is the already-translated marker, because this module has
 * no i18n runtime: the React surfaces pass `t('merchant.revenue.rateCurrent')`
 * while the CSV keeps its plain-English constant.
 */
export function formatCommissionRateLabel(
  commissionRate: string | null | undefined,
  currentRateMarker: string,
  commissionRateLocked: boolean,
): string | null {
  const percent = formatCommissionRatePercent(commissionRate);
  if (percent === null) return null;
  return needsCurrentRateMarker(commissionRateLocked) ? `${percent} ${currentRateMarker}` : percent;
}