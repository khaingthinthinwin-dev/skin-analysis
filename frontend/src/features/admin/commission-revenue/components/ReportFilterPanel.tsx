import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { CommissionGroupBy, CommissionReportFilter } from '../services/commission.service';

interface ReportFilterPanelProps {
  onApply: (filters: CommissionReportFilter) => void;
  onReset: () => void;
  groupBy?: CommissionGroupBy;
}

// [E] Report filter panel (DD_02). From/To date inputs with Apply/Reset.
// Validates that From <= To. Empty values fetch the default (unfiltered) page.
export const ReportFilterPanel: React.FC<ReportFilterPanelProps> = ({
  onApply,
  onReset,
  groupBy: initialGroupBy = 'merchant',
}) => {
  const { t } = useTranslation();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [groupBy, setGroupBy] = useState<CommissionGroupBy>(initialGroupBy);
  const [error, setError] = useState('');

  const handleApply = () => {
    setError('');
    if (from && to && new Date(from) > new Date(to)) {
      setError(t('admin.commission.filters.invalidDateRange', 'From date must be earlier than or equal to To date.'));
      return;
    }
    onApply({ from: from || undefined, to: to || undefined, groupBy });
  };

  const handleReset = () => {
    setFrom('');
    setTo('');
    setGroupBy('merchant');
    setError('');
    onReset();
  };

  const handleGroupByChange = (value: CommissionGroupBy) => {
    setGroupBy(value);
    onApply({ from: from || undefined, to: to || undefined, groupBy: value });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-card-foreground text-[15px] font-bold">
          {t('admin.commission.reportTitlePlain', 'Commission Report')}
        </span>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
        {([ 
          ['merchant', t('admin.commission.groupBy.byMerchant', 'By Merchant')],
          ['day', t('admin.commission.groupBy.byDay', 'By Day')],
          ['order', t('admin.commission.groupBy.byOrder', 'By Order')],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="button"
            aria-pressed={groupBy === value}
            onClick={() => handleGroupByChange(value)}
            className={`rounded-md border px-3 py-2 text-xs font-semibold transition-all duration-200 ease-in-out ${
              groupBy === value
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-muted'
            }`}
          >
            {label}
          </button>
        ))}

        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:flex-none">
          <span className="text-sm text-muted-foreground font-medium">{t('admin.commission.filters.from', 'From')}</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label={t('admin.commission.filters.fromDate', 'From date')}
            className="flex-1 px-3 py-2 border border-border rounded-md text-[13px] bg-muted text-foreground outline-none min-w-[140px]"
          />
          <span className="text-sm text-muted-foreground font-medium">{t('admin.commission.filters.to', 'To')}</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label={t('admin.commission.filters.toDate', 'To date')}
            className="flex-1 px-3 py-2 border border-border rounded-md text-[13px] bg-muted text-foreground outline-none min-w-[140px]"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
        <button
          onClick={handleApply}
          className="px-4 py-2 text-[13px] font-semibold rounded-lg border-none bg-primary text-primary-foreground cursor-pointer"
        >
          {t('admin.commission.filters.apply', 'Apply')}
        </button>
        {/* Ghost variant so the Reset button matches the Revenue tab Reset colour. */}
        <Button variant="outline" size="sm" onClick={handleReset}>
          {t('admin.commission.filters.reset', 'Reset')}
        </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
};
