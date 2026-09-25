import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrencyAmount } from '../types/merchantOrderInsights.types';
import type { RevenueSummaryDto, SummaryPeriod } from '../types/merchantOrderInsights.types';
import { formatRangeLabel, resolveActiveRange } from '../utils/dateRangeLabel';
import { PeriodSelector } from './PeriodSelector';
import { RangeLabelPill } from './RangeLabelPill';
import { CustomRangeModal } from './CustomRangeModal';

/** Operator circles ("−", "=") inside the formula box. */
const operatorClassName = 'flex h-6 w-6 items-center justify-center self-center justify-self-center rounded-full bg-gray-100 text-sm leading-none text-gray-400';
const metricLabelClassName = 'm-0 text-xs font-medium text-gray-500';
// `sm:mt-1` keeps the desktop label/value stack while the mobile rows (BR-OI-026 vertical
// stack) place label and value on one line, where the 4px top margin would misalign them.
const metricValueClassName = 'm-0 whitespace-nowrap text-[20px] font-medium text-gray-900 sm:mt-1';
// One stat row: a label/value line inside the box below `sm`, the original stacked block from `sm` up.
const metricRowClassName = 'flex min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2 sm:block sm:px-0 sm:py-1';

/**
 * Revenue Summary card (EL-OI-38): title with the active-range pill, the period
 * pill toggle that opens the custom range modal, the Sales − Commission =
 * Revenue formula box with AOV after a divider, and the footer carrying the
 * BR-OI-032 disclaimer inside an info-icon tooltip while the commission rate is
 * not locked.
 *
 * The v2 revenue trend chart is deliberately not rendered here: the API contract
 * (RevenueSummaryDto) exposes period aggregates only, so there is no weekly series
 * to plot.
 */
export function RevenueSummaryGroup({ data, loading, period, from, to, onPeriodChange, onApply, error }: { data?: RevenueSummaryDto; loading?: boolean; period: SummaryPeriod; from?: string; to?: string; onPeriodChange: (period: SummaryPeriod, from?: string, to?: string) => void; onApply?: (from: string, to: string) => void; error?: string }) {
  const { t } = useTranslation();
  // Same surface recipe as the Buyer Order Insights cards: white, soft layered shadow.
  const cardClassName = 'border-gray-200 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.08)]';
  const toggleRef = useRef<HTMLDivElement>(null);
  // Set on every close so the effect below can hand the focus back to the toggle.
  const refocusToggle = useRef(false);
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  // Clicking "Custom" makes the pill active right away; the figures stay pending until Apply.
  const visiblePeriod: SummaryPeriod = customRangeOpen ? 'custom' : period;
  const customPending = visiblePeriod === 'custom' && !(from && to);
  const activeRange = customPending ? undefined : resolveActiveRange(visiblePeriod, { from, to }, data?.period);
  const rangeLabel = formatRangeLabel(activeRange?.from, activeRange?.to);

  const focusCustomToggle = useCallback(
    () => toggleRef.current?.querySelector<HTMLButtonElement>('[data-period="custom"]')?.focus(),
    [],
  );
  // Clicking "Custom" only opens the modal: nothing is fetched until Apply.
  const handlePeriodChange = (next: SummaryPeriod) => {
    if (next === 'custom') {
      setCustomRangeOpen(true);
      return;
    }
    setCustomRangeOpen(false);
    onPeriodChange(next);
  };
  // Cancel, the X, Escape and a click on the dimmed backdrop all keep the current
  // figures and fall back to the period that was active before the modal opened.
  const closeCustomRange = () => {
    refocusToggle.current = true;
    setCustomRangeOpen(false);
  };
  const applyCustomRange = (nextFrom: string, nextTo: string) => {
    refocusToggle.current = true;
    onApply?.(nextFrom, nextTo);
    setCustomRangeOpen(false);
  };

  // Focus returns to the Custom toggle once the modal has left the DOM: focusing it
  // earlier only makes the still-mounted focus trap pull the focus back inside.
  useEffect(() => {
    if (customRangeOpen || !refocusToggle.current) return;
    refocusToggle.current = false;
    focusCustomToggle();
  }, [customRangeOpen, focusCustomToggle]);

  if (loading) return <Card className={cardClassName}><CardContent className="space-y-5 p-5 sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Skeleton className="h-6 w-44" /><Skeleton className="h-10 w-full rounded-full sm:w-[380px]" /></div>
    <Skeleton className="h-[80px] rounded-lg" />
    <Skeleton className="h-4 w-72" />
  </CardContent></Card>;

  // While a custom range is being picked the figures stay pending instead of showing stale numbers.
  const displayData = customPending ? undefined : data;
  const metricText = (value?: string) => (value === undefined ? '—' : formatCurrencyAmount(value));
  // `commissionRate` is a DECIMAL string, so drop insignificant trailing zeros (12.00 -> 12).
  const rateLabel = `${Number(displayData?.commissionRate ?? 0)}%`;
  const orderCount = displayData?.orderCount ?? 0;
  const ordersWord = orderCount === 1
    ? t('merchant.revenue.orderOne', 'order')
    : t('merchant.revenue.orderOther', 'orders');
  const footerText = `${t('merchant.revenue.basisPrefix', 'Based on')} ${orderCount} ${ordersWord} · ${t('merchant.revenue.commissionAt', 'Commission at')} ${rateLabel}`;
  const rateNote = t('merchant.revenue.rateNote', 'Commission is calculated with the current platform rate; historical rate locking is pending.');

  return <Card className={cardClassName}><CardContent className="space-y-5 p-5 sm:p-6">
    {/* The header row is a direct child of CardContent so the single 20px stack gap
        (`space-y-5`) sits between it and the formula box in every state, also when the
        row wraps onto two lines on narrow screens. */}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h2 className="m-0 text-[17px] font-bold text-gray-900">{t('merchant.revenue.title', 'Revenue Summary')}</h2>
        {rangeLabel && <RangeLabelPill label={rangeLabel} interactive={visiblePeriod === 'custom'} onClick={() => setCustomRangeOpen(true)} />}
      </div>
      <div ref={toggleRef} className="w-full sm:w-max"><PeriodSelector value={visiblePeriod} from={from} to={to} onChange={handlePeriodChange} /></div>
    </div>

    {/* Below `sm` the four figures stack vertically (BR-OI-026, DD §2.4) as label/value rows so the
        20px Ks amounts never collide with the operator chips; from `sm` up this is the original
        Sales − Commission = Revenue | AOV formula row. */}
    <div className="grid grid-cols-1 gap-y-1 rounded-lg border border-gray-200 bg-white p-1.5 sm:grid-cols-[1fr_auto_1fr_auto_1fr_1px_1fr] sm:gap-x-3 sm:gap-y-3 sm:px-4 sm:py-3">
      <div className={metricRowClassName}>
        <p className={metricLabelClassName}>{t('merchant.revenue.sales', 'Sales')}</p>
        <p className={metricValueClassName}>{metricText(displayData?.sales)}</p>
      </div>
      <span aria-hidden="true" className={operatorClassName}>−</span>
      <div className={metricRowClassName}>
        <p className={metricLabelClassName}>{t('merchant.revenue.commission', 'Commission')}</p>
        <p className={metricValueClassName}>{metricText(displayData?.commission)}</p>
      </div>
      <span aria-hidden="true" className={operatorClassName}>=</span>
      <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-[#f9f5ff] px-3 py-2 sm:block sm:py-1">
        <p className="m-0 text-xs font-medium text-[#7c3aed]">{t('merchant.revenue.net', 'Revenue')}</p>
        <p className="m-0 whitespace-nowrap text-[20px] font-medium text-[#7c3aed] sm:mt-1">{metricText(displayData?.revenue)}</p>
      </div>
      <div aria-hidden="true" className="h-px w-full self-center bg-gray-200 sm:h-auto sm:self-stretch" />
      <div className={metricRowClassName}>
        <p className={metricLabelClassName}>{t('merchant.revenue.aov', 'AOV')}</p>
        <p className={metricValueClassName}>{metricText(displayData?.aov)}</p>
      </div>
    </div>

    <div>
      <TooltipProvider delayDuration={200}>
        <p className="m-0 flex items-center gap-1.5 text-[12.5px] text-gray-500">
          <span>{footerText}</span>
          {displayData && !displayData.commissionRateLocked && <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={rateNote} className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]/40">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{rateNote}</TooltipContent>
          </Tooltip>}
        </p>
      </TooltipProvider>
    </div>

    {/* The custom range dialog is portalled to the body by the shared Dialog. */}
    {customRangeOpen && <CustomRangeModal from={from} to={to} error={error} onApply={applyCustomRange} onClose={closeCustomRange} />}
  </CardContent></Card>;
}
