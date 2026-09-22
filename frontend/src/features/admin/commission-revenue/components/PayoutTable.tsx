import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, DollarSign } from 'lucide-react';
import { Payout } from '../services/commission.service';
import { PayoutStatusBadge } from './badges';
import { formatCurrency } from '../utils/format';

interface PayoutTableProps {
  payouts?: Payout[];
  onProcessPayout?: (id: string) => void;
  onViewDetail?: (id: string) => void;
  selectedPayoutIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const PayoutTable: React.FC<PayoutTableProps> = ({
  payouts = [],
  onProcessPayout,
  onViewDetail,
  selectedPayoutIds,
  onSelectionChange,
}) => {
  const selected = new Set(selectedPayoutIds);
  const pagePayoutIds = payouts.map((payout) => payout.payoutId);
  const allPageSelected = pagePayoutIds.length > 0 && pagePayoutIds.every((id) => selected.has(id));

  const togglePayout = (payoutId: string) => {
    onSelectionChange(
      selected.has(payoutId)
        ? selectedPayoutIds.filter((id) => id !== payoutId)
        : [...selectedPayoutIds, payoutId],
    );
  };

  const togglePage = () => {
    onSelectionChange(
      allPageSelected
        ? selectedPayoutIds.filter((id) => !pagePayoutIds.includes(id))
        : [...new Set([...selectedPayoutIds, ...pagePayoutIds])],
    );
  };

  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <div className="max-h-[400px] overflow-y-auto">
      <Table className="w-full">
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead className="w-12 bg-background">
              <input
                type="checkbox"
                aria-label="Select all payouts on this page"
                checked={allPageSelected}
                onChange={togglePage}
              />
            </TableHead>
            <TableHead className="bg-background">Merchant</TableHead>
            <TableHead className="bg-background">Period</TableHead>
            <TableHead className="bg-background">Commission Rate</TableHead>
            <TableHead className="bg-background">Total Amount</TableHead>
            <TableHead className="bg-background">Commission</TableHead>
            <TableHead className="bg-background">Net Payout</TableHead>
            <TableHead className="bg-background">Status</TableHead>
            <TableHead className="bg-background">Payment Date</TableHead>
            <TableHead className="text-right bg-background">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payouts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
                No merchant payouts found.
              </TableCell>
            </TableRow>
          ) : (
            payouts.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`Select payout ${p.orderId ?? p.payoutId}`}
                    checked={selected.has(p.payoutId)}
                    onChange={() => togglePayout(p.payoutId)}
                  />
                </TableCell>
                <TableCell className="font-medium">{p.merchantName}</TableCell>
                <TableCell>{formatPeriod(p.period)}</TableCell>
                <TableCell>{p.commissionRate}%</TableCell>
                <TableCell>{formatCurrency(p.totalAmount)} Ks</TableCell>
                <TableCell className="text-destructive">-{formatCurrency(p.commissionAmount)} Ks</TableCell>
                <TableCell className="font-semibold">{formatCurrency(p.netAmount)} Ks</TableCell>
                <TableCell>
                  <PayoutStatusBadge status={p.status} />
                </TableCell>
                <TableCell>{p.processedAt ? formatDate(p.processedAt) : '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-sky-300 bg-sky-100 text-sky-700 hover:bg-sky-200 hover:text-sky-800"
                      onClick={() => onViewDetail?.(p.payoutId)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-300 bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 disabled:opacity-50"
                      disabled={p.status === 'completed'}
                      onClick={() => onProcessPayout?.(p.payoutId)}
                    >
                      <DollarSign className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
};

const formatPeriod = (period: string): string => {
  const date = new Date(`${period}-01T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

