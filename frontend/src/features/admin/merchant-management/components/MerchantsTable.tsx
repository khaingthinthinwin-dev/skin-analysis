import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Merchant } from '../services/merchant.service';

interface MerchantsTableProps {
  merchants?: Merchant[];
  onSelectReview?: (merchant: Merchant) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
}

export const MerchantsTable: React.FC<MerchantsTableProps> = ({
  merchants = [],
  onSelectReview,
  onApprove,
}) => {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Shop Name</TableHead>
            <TableHead>User Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {merchants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                No merchant applications.
              </TableCell>
            </TableRow>
          ) : (
            merchants.map((merchant) => (
              <TableRow key={merchant.id}>
                <TableCell className="font-medium">{merchant.shop_name}</TableCell>
                <TableCell>{merchant.user?.email || merchant.user_id}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      merchant.license_status === 'approved'
                        ? 'default'
                        : merchant.license_status === 'rejected'
                        ? 'destructive'
                        : 'outline'
                    }
                  >
                    {merchant.license_status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(merchant.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => onSelectReview?.(merchant)}>
                    View License
                  </Button>
                  {merchant.license_status === 'pending' && (
                    <Button size="sm" onClick={() => onApprove?.(merchant.id)}>
                      Approve
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
