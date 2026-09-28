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
  const target = count === 1 ? 'this history record' : `these ${count} history records`

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Delete Fee Change History</DialogTitle>
          <DialogDescription className="text-center">
            Permanently delete {target} from the fee change history.
          </DialogDescription>
        </DialogHeader>
        <p role="alert" className="text-sm text-muted-foreground">
          This action cannot be undone. History records created in the current month are
          protected and will always be rejected.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Confirm Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
