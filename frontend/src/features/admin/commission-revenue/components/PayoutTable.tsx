import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, DollarSign } from 'lucide-react';
import { Payout } from '../services/commission.service';

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
    <div className="rounded-md border bg-card">
      <div className="max-h-[400px] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <input
                type="checkbox"
                aria-label="Select all payouts on this page"
                checked={allPageSelected}
                onChange={togglePage}
              />
            </TableHead>
            <TableHead>Merchant</TableHead>
            <TableHead>Order Number</TableHead>
            <TableHead>Commission Rate</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>Commission Fee</TableHead>
            <TableHead>Net Payout</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payouts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
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
                <TableCell className="max-w-[220px]">
                  {p.orderId ? (
                    <span className="block truncate font-mono text-xs" title={p.orderId}>
                      {p.orderId}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{p.commissionRate}%</TableCell>
                <TableCell>${p.totalAmount}</TableCell>
                <TableCell className="text-destructive">-${p.commissionAmount}</TableCell>
                <TableCell className="font-semibold">${p.netAmount}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      p.status === 'completed'
                        ? 'default'
                        : p.status === 'failed'
                        ? 'destructive'
                        : 'outline'
                    }
                  >
                    {p.status}
                  </Badge>
                </TableCell>
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

