import { useState } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
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
import type { AdminAdFeeSetting } from '@/types/admin-ad-management'
import { TierBadge } from './badges'
import { PLACEMENT_LABELS } from '../utils/labels'

const REASON_MAX = 1000

interface ReactivateFeeModalProps {
  open: boolean
  feeSetting: AdminAdFeeSetting | null
  isLoading?: boolean
  onConfirm: (reason?: string) => void
  onClose: () => void
}

export function ReactivateFeeModal({
  open,
  feeSetting,
  isLoading = false,
  onConfirm,
  onClose,
}: ReactivateFeeModalProps) {
  const [reason, setReason] = useState('')

  const canConfirm = reason.trim().length <= REASON_MAX

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <RotateCcw className="h-6 w-6 text-emerald-600" />
          </div>
          <DialogTitle className="text-center">Reactivate Fee Setting</DialogTitle>
          <DialogDescription className="text-center">
            {feeSetting
              ? `${PLACEMENT_LABELS[feeSetting.placement]} - ${feeSetting.tier}`
              : 'Reactivate fee setting.'}
          </DialogDescription>
        </DialogHeader>
        {feeSetting && (
          <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium">{PLACEMENT_LABELS[feeSetting.placement]}</span>
            <TierBadge tier={feeSetting.tier} />
          </div>
        )}
        <div className="space-y-3">
          <p role="alert" className="text-sm text-muted-foreground">
            This package will become available to merchants again with its current rate
            and configuration.
          </p>
          <div className="space-y-1">
            <label htmlFor="reactivate-reason" className="text-sm font-medium">
              Change reason <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="reactivate-reason"
              value={reason}
              maxLength={REASON_MAX}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Why is this fee setting reactivated?"
              className={reason.length > REASON_MAX ? 'border-destructive' : ''}
            />
            <p className="text-right text-xs text-muted-foreground">{reason.length}/{REASON_MAX}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(reason.trim() || undefined)} disabled={!canConfirm}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reactivating...
              </>
            ) : (
              'Confirm Reactivate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}