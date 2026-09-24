import React from 'react';
import { CommissionGroupBy, CommissionReport } from '../services/commission.service';
import { formatCurrency } from '../utils/format';

interface CommissionReportsTableProps {
  reports?: CommissionReport[];
  groupBy?: CommissionGroupBy;
}

// Merchant commission reports (GET /admin/commission/reports).
// Commission is derived from each merchant's completed order revenue at the
// platform rate that was effective when each order was placed; values are
// decimal strings from the backend.  A merchant may appear in multiple rows
// when their orders span different commission-rate periods.
export const CommissionReportsTable: React.FC<CommissionReportsTableProps> = ({
  reports = [],
  groupBy = 'merchant',
}) => {
  const thClass = "text-left py-2.5 px-2 sm:px-3.5 text-xs font-bold uppercase tracking-wide text-muted-foreground border-b border-border bg-primary/10 whitespace-nowrap";

  const tdClass = "py-3 px-2 sm:px-3.5 text-[13px] text-muted-foreground border-b border-border whitespace-nowrap bg-card";

  return (
    <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-10">
          <tr>
            {groupBy === 'day' && <th scope="col" className={thClass}>Date</th>}
            {groupBy === 'order' && <th scope="col" className={thClass}>Order Number</th>}
            {groupBy === 'order' && <th scope="col" className={thClass}>Date</th>}
            <th scope="col" className={thClass}>Merchant</th>
            <th scope="col" className={`${thClass} text-right`}>Commission Rate</th>
            {groupBy !== 'order' && <th scope="col" className={`${thClass} text-right`}>Orders</th>}
            <th scope="col" className={`${thClass} text-right`}>Revenue</th>
            <th scope="col" className={`${thClass} text-right`}>Commission</th>
          </tr>
        </thead>
        <tbody>
          {reports.length === 0 ? (
            <tr>
              <td colSpan={groupBy === 'order' ? 6 : 5} className={`${tdClass} text-center py-6 text-muted-foreground`}>
                No commission reports found.
              </td>
            </tr>
          ) : (
            reports.map((r, idx) => (
              <tr key={`${r.orderId ?? r.merchantId}-${r.date ?? ''}-${r.commissionRate}-${idx}`}>
                {groupBy === 'day' && <td className={tdClass}>{r.date}</td>}
                {groupBy === 'order' && <td className={`${tdClass} text-foreground font-medium`}>{r.orderNumber}</td>}
                {groupBy === 'order' && <td className={tdClass}>{r.date ? new Date(r.date).toLocaleString() : '-'}</td>}
                <td className={`${tdClass} text-foreground font-medium`}>{r.merchantName}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{r.commissionRate}%</td>
                {groupBy !== 'order' && <td className={`${tdClass} text-right tabular-nums`}>{r.orders}</td>}
                <td className={`${tdClass} text-right tabular-nums`}>{formatCurrency(r.revenue)} Ks</td>
                <td className={`${tdClass} text-right text-primary font-semibold tabular-nums`}>{formatCurrency(r.commission)} Ks</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
