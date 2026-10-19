import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.merchants.table.shopName', 'Shop Name')}</TableHead>
            <TableHead>{t('admin.merchants.table.userEmail', 'User Email')}</TableHead>
            <TableHead>{t('admin.merchants.field.licenseStatus', 'License Status')}</TableHead>
            <TableHead>{t('admin.merchants.table.submittedAt', 'Submitted At')}</TableHead>
            <TableHead className="text-right">{t('admin.merchants.table.actions', 'Actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {merchants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                {t('admin.merchants.table.emptyApplications', 'No merchant applications.')}
              </TableCell>
            </TableRow>
          ) : (
            merchants.map((merchant) => (
              <TableRow key={merchant.id}>
                <TableCell className="font-medium">{merchant.shopName}</TableCell>
                <TableCell>{merchant.user?.email || merchant.userId}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      merchant.licenseStatus === 'approved'
                        ? 'default'
                        : merchant.licenseStatus === 'rejected'
                        ? 'destructive'
                        : 'outline'
                    }
                  >
                    {merchant.licenseStatus}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(merchant.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={merchant.licenseStatus !== 'approved'}
                    onClick={() => onSelectReview?.(merchant)}
                  >
                    {t('admin.merchants.table.viewLicense', 'View License')}
                  </Button>
                  {merchant.licenseStatus === 'pending' && (
                    <Button size="sm" onClick={() => onApprove?.(merchant.id)}>
                      {t('admin.merchants.actions.approve', 'Approve')}
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
