import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface BulkApproveModalProps {
  open: boolean
  count: number
  isLoading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function BulkApproveModal({
  open,
  count,
  isLoading = false,
  onConfirm,
  onClose,
}: BulkApproveModalProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <AlertTriangle className="h-6 w-6 text-green-700" />
          </div>
          <DialogTitle className="text-center">
            {t('admin.ads.bulkApprove.title', 'Bulk Approve Ads')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t('admin.ads.bulkApprove.description', 'You are about to approve {{count}} advertisements.', { count })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading
              ? t('admin.ads.bulkApprove.approving', 'Approving...')
              : t('admin.ads.bulkApprove.confirm', 'Confirm Approve')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}