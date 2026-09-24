import { useTranslation } from 'react-i18next';
import type { SummaryPeriod } from '../types/merchantOrderInsights.types';

/** Ordered period options backing the pill toggle (EL-OI-38). */
const PERIOD_OPTIONS: Array<{ value: SummaryPeriod; labelKey: string; fallback: string }> = [
  { value: 'today', labelKey: 'merchant.revenue.today', fallback: 'Today' },
  { value: 'this_month', labelKey: 'merchant.revenue.thisMonth', fallback: 'This Month' },
  { value: 'last_month', labelKey: 'merchant.revenue.lastMonth', fallback: 'Last Month' },
  { value: 'custom', labelKey: 'merchant.revenue.custom', fallback: 'Custom' },
];

const activeClassName = 'inline-flex h-[32px] min-w-[88px] items-center justify-center rounded-full bg-white px-4 text-[13px] font-medium text-[#7c3aed] shadow-[0_2px_6px_rgba(0,0,0,0.10)]';
const inactiveClassName = 'inline-flex h-[32px] min-w-[88px] items-center justify-center rounded-full px-4 text-[13px] font-medium text-gray-500 transition hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]/40';

export function PeriodSelector({ value, from, to, onChange }: { value: SummaryPeriod; from?: string; to?: string; onChange: (value: SummaryPeriod, from?: string, to?: string) => void }) {
  const { t } = useTranslation();
  return <div role="group" aria-label={t('merchant.revenue.period', 'Period')} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 p-1">
    {PERIOD_OPTIONS.map((option) => {
      const isActive = option.value === value;
      return <button
        key={option.value}
        type="button"
        data-period={option.value}
        aria-pressed={isActive}
        onClick={() => onChange(option.value, option.value === 'custom' ? from : undefined, option.value === 'custom' ? to : undefined)}
        className={isActive ? activeClassName : inactiveClassName}
      >{t(option.labelKey, option.fallback)}</button>;
    })}
  </div>;
}
