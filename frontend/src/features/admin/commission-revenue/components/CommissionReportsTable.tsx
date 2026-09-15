import React from 'react';
import { CommissionReport } from '../services/commission.service';

interface CommissionReportsTableProps {
  reports?: CommissionReport[];
}

// Merchant commission reports (GET /admin/commission/reports).
// Commission is derived from each merchant's completed order revenue at the
// platform rate that was effective when each order was placed; values are
// decimal strings from the backend.  A merchant may appear in multiple rows
// when their orders span different commission-rate periods.
export const CommissionReportsTable: React.FC<CommissionReportsTableProps> = ({
  reports = [],
}) => {
  const thClass = "text-left py-2.5 px-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border bg-surface-dim";

  const tdClass = "py-3 px-3.5 text-[13px] text-muted-foreground border-b border-border";

  return (
    <div className="rounded-md border bg-card">
      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Merchant</th>
            <th className={`${thClass} text-right`}>Commission Rate</th>
            <th className={`${thClass} text-right`}>Orders</th>
            <th className={`${thClass} text-right`}>Revenue</th>
            <th className={`${thClass} text-right`}>Commission</th>
          </tr>
        </thead>
        <tbody>
          {reports.length === 0 ? (
            <tr>
              <td colSpan={5} className={`${tdClass} text-center py-6 text-muted-foreground`}>
                No commission reports found.
              </td>
            </tr>
          ) : (
            reports.map((r, idx) => (
              <tr key={`${r.merchantId}-${r.commissionRate}-${idx}`}>
                <td className={`${tdClass} text-foreground font-medium`}>{r.merchantName}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{r.commissionRate}%</td>
                <td className={`${tdClass} text-right tabular-nums`}>{r.orders}</td>
                <td className={`${tdClass} text-right tabular-nums`}>${r.revenue}</td>
                <td className={`${tdClass} text-right text-primary font-semibold tabular-nums`}>${r.commission}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
};
