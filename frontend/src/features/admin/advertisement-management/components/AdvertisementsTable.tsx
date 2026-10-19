import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AdminAdvertisement } from '@/types/admin-ad-management';

interface AdvertisementsTableProps {
  ads?: AdminAdvertisement[];
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
}

export const AdvertisementsTable: React.FC<AdvertisementsTableProps> = ({
  ads = [],
  onApprove,
  onReject,
}) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.ads.list.table.title', 'Ad Title')}</TableHead>
            <TableHead>{t('admin.ads.reviewModal.announcement', 'Announcement')}</TableHead>
            <TableHead>{t('admin.ads.list.table.payment', 'Payment')}</TableHead>
            <TableHead>{t('admin.ads.list.table.approval', 'Approval')}</TableHead>
            <TableHead className="text-right">{t('admin.ads.list.table.actions', 'Actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                {t('admin.ads.list.noSubmissions', 'No advertisement submissions.')}
              </TableCell>
            </TableRow>
          ) : (
            ads.map((ad, index) => (
              <TableRow key={ad.id} className={index % 2 === 1 ? 'bg-muted/50' : undefined}>
                <TableCell className="font-medium">{ad.title}</TableCell>
                <TableCell className="max-w-xs truncate">{ad.announcementMessage}</TableCell>
                <TableCell>
                  <Badge variant={ad.paymentStatus === 'completed' ? 'default' : 'outline'}>
                    {t(`admin.ads.status.${ad.paymentStatus}`, ad.paymentStatus)}
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
                    {t(`admin.ads.status.${ad.approvalStatus}`, ad.approvalStatus)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {ad.approvalStatus === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => onApprove?.(ad.id)}>
                        {t('admin.ads.list.approve', 'Approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onReject?.(ad.id, 'Inappropriate content')}
                      >
                        {t('admin.ads.list.reject', 'Reject')}
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
