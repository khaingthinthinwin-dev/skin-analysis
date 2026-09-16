import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

const REASON_MAX = 1000

interface BulkRejectModalProps {
  open: boolean
  count: number
  isLoading?: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}

export function BulkRejectModal({
  open,
  count,
  isLoading = false,
  onConfirm,
  onClose,
}: BulkRejectModalProps) {
  const [reason, setReason] = useState('')

  const canConfirm = reason.trim().length > 0 && reason.trim().length <= REASON_MAX

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Bulk Reject Ads</DialogTitle>
          <DialogDescription className="text-center">
            You are about to reject {count} advertisement{count === 1 ? '' : 's'}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <p role="alert" className="text-sm text-destructive">
            The advertisements will not be displayed. Paid amounts will be refunded in full (100%)
            according to the refund rule.
          </p>
          <div className="space-y-1">
            <label htmlFor="bulk-reject-reason" className="text-sm font-medium">
              Rejection reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="bulk-reject-reason"
              value={reason}
              maxLength={REASON_MAX}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Describe why these advertisements are rejected..."
              className={reason.length > REASON_MAX ? 'border-destructive' : ''}
            />
            <p className="text-right text-xs text-muted-foreground">{reason.length}/{REASON_MAX}</p>
            {reason.trim().length === 0 && (
              <p role="alert" className="text-sm text-destructive">
                Rejection reason is required.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(reason.trim())} disabled={!canConfirm}>
            {isLoading ? 'Rejecting...' : 'Confirm Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}