import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Merchant } from '../services/merchant.service';

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
          <DialogTitle>Business License Review: {merchant.shop_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Document URL:</p>
            <a
              href={merchant.business_license_url}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline text-sm break-all"
            >
              {merchant.business_license_url}
            </a>
          </div>

          {isRejecting ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Reason:</label>
              <Textarea
                placeholder="State rejection details (e.g. expired document)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          {isRejecting ? (
            <>
              <Button variant="outline" onClick={() => setIsRejecting(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRejectSubmit}>
                Confirm Rejection
              </Button>
            </>
          ) : (
            <>
              <Button variant="destructive" onClick={() => setIsRejecting(true)}>
                Reject
              </Button>
              <Button
                onClick={() => {
                  onApprove(merchant.id);
                  onClose();
                }}
              >
                Approve Merchant
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
