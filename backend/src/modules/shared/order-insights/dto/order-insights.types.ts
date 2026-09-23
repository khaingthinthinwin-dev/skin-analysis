export type SummaryPeriod = 'today' | 'this_month' | 'last_month' | 'custom';

export const SUMMARY_PERIOD_VALUES: SummaryPeriod[] = [
  'today',
  'this_month',
  'last_month',
  'custom',
];

export type CommissionRateSource = 'current_settings' | 'order_snapshot';
