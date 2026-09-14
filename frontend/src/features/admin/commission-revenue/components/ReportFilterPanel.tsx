import React, { useState } from 'react';
import { CommissionReportFilter } from '../services/commission.service';

interface ReportFilterPanelProps {
  onApply: (filters: CommissionReportFilter) => void;
  onReset: () => void;
}

// [E] Report filter panel (DD_02). From/To date inputs with Apply/Reset.
// Validates that From <= To. Empty values fetch the default (unfiltered) page.
export const ReportFilterPanel: React.FC<ReportFilterPanelProps> = ({
  onApply,
  onReset,
}) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  const handleApply = () => {
    setError('');
    if (from && to && new Date(from) > new Date(to)) {
      setError('From date must be earlier than or equal to To date.');
      return;
    }
    onApply({ from: from || undefined, to: to || undefined });
  };

  const handleReset = () => {
    setFrom('');
    setTo('');
    setError('');
    onReset();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-card-foreground text-[15px] font-bold">
          Commission Report
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground font-medium">From</span>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="px-3 py-2 border border-border rounded-md text-[13px] bg-muted text-foreground outline-none"
        />
        <span className="text-sm text-muted-foreground font-medium">To</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="px-3 py-2 border border-border rounded-md text-[13px] bg-muted text-foreground outline-none"
        />
        <button
          onClick={handleApply}
          className="px-4 py-2 text-[13px] font-semibold rounded-lg border-none bg-primary text-primary-foreground cursor-pointer"
        >
          Apply
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 text-[13px] font-semibold rounded-lg bg-transparent text-muted-foreground border border-border cursor-pointer"
        >
          Reset
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
};
