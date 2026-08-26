import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Advertisement } from '../services/advertisement.service';

interface AdvertisementsTableProps {
  ads?: Advertisement[];
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
}

export const AdvertisementsTable: React.FC<AdvertisementsTableProps> = ({
  ads = [],
  onApprove,
  onReject,
}) => {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ad Title</TableHead>
            <TableHead>Announcement</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Approval</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                No advertisement submissions.
              </TableCell>
            </TableRow>
          ) : (
            ads.map((ad) => (
              <TableRow key={ad.id}>
                <TableCell className="font-medium">{ad.title}</TableCell>
                <TableCell className="max-w-xs truncate">{ad.announcementMessage}</TableCell>
                <TableCell>
                  <Badge variant={ad.paymentStatus === 'completed' ? 'default' : 'outline'}>
                    {ad.paymentStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      ad.approvalStatus === 'approved'
                        ? 'default'
                        : ad.approvalStatus === 'rejected'
                        ? 'destructive'
                        : 'outline'
                    }
                  >
                    {ad.approvalStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {ad.approvalStatus === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => onApprove?.(ad.id)}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onReject?.(ad.id, 'Inappropriate content')}
                      >
                        Reject
                      </Button>
                    </>
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
