import { useTranslation } from 'react-i18next'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteFeeHistoryModalProps {
  open: boolean
  count: number
  isLoading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function DeleteFeeHistoryModal({
  open,
  count,
  isLoading = false,
  onConfirm,
  onClose,
}: DeleteFeeHistoryModalProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">{t('admin.ads.fee.deleteHistory.title', 'Delete Fee Change History')}</DialogTitle>
          <DialogDescription className="text-center">
            {count === 1
              ? t('admin.ads.fee.deleteHistory.descriptionOne', 'Permanently delete this history record from the fee change history.')
              : t('admin.ads.fee.deleteHistory.descriptionCount', {
                  count,
                  defaultValue: 'Permanently delete these {{count}} history records from the fee change history.',
                })}
          </DialogDescription>
        </DialogHeader>
        <p role="alert" className="text-sm text-muted-foreground">
          {t('admin.ads.fee.deleteHistory.warning', 'This action cannot be undone. History records created in the current month are protected and will always be rejected.')}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('admin.ads.fee.deleteHistory.deleting', 'Deleting...')}
              </>
            ) : (
              t('admin.ads.fee.deleteHistory.confirm', 'Confirm Delete')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
