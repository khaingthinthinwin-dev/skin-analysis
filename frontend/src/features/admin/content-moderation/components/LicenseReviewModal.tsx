import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Merchant } from '../../merchant-management/services/merchant.service';

interface LicenseReviewModalProps {
  merchant: Merchant | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}

export const LicenseReviewModal: React.FC<LicenseReviewModalProps> = ({
  merchant,
  isOpen,
  onClose,
  onApprove,
  onReject,
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  if (!merchant) return null;

  const handleRejectSubmit = () => {
    if (reason.trim()) {
      onReject(merchant.id, reason);
      setIsRejecting(false);
      setReason('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('admin.content.license.title', 'Business License Review: {{shopName}}', {
              shopName: merchant.shopName,
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('admin.content.license.documentUrl', 'Document URL:')}
            </p>
            <a
              href={merchant.businessLicenseUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline text-sm break-all"
            >
              {merchant.businessLicenseUrl}
            </a>
          </div>

          {isRejecting ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('admin.content.license.rejectionReason', 'Rejection Reason:')}
              </label>
              <Textarea
                placeholder={t(
                  'admin.content.license.rejectionPlaceholder',
                  'State rejection details (e.g. expired document)...',
                )}
                value={reason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          {isRejecting ? (
            <>
              <Button variant="outline" onClick={() => setIsRejecting(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button variant="destructive" onClick={handleRejectSubmit}>
                {t('admin.content.license.confirmRejection', 'Confirm Rejection')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="destructive" onClick={() => setIsRejecting(true)}>
                {t('admin.content.license.reject', 'Reject')}
              </Button>
              <Button
                onClick={() => {
                  onApprove(merchant.id);
                  onClose();
                }}
              >
                {t('admin.content.license.approve', 'Approve Merchant')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
