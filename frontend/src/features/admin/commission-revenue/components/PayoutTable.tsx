import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Payout } from '../services/commission.service';

interface PayoutTableProps {
  payouts?: Payout[];
  onProcessPayout?: (id: string) => void;
}

export const PayoutTable: React.FC<PayoutTableProps> = ({ payouts = [], onProcessPayout }) => {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Merchant ID</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>Commission Fee</TableHead>
            <TableHead>Ad Fee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payouts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                No merchant payouts found.
              </TableCell>
            </TableRow>
          ) : (
            payouts.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.merchant_id}</TableCell>
                <TableCell>${p.total_amount}</TableCell>
                <TableCell className="text-destructive">-${p.commission_amount}</TableCell>
                <TableCell className="text-destructive">-${p.ad_fee_amount}</TableCell>
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
                  {p.status === 'pending' && (
                    <Button size="sm" onClick={() => onProcessPayout?.(p.id)}>
                      Process Payout
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
