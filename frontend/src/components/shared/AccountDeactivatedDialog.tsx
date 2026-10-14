import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AccountDeactivatedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deactivationReason?: string | null;
}

export function AccountDeactivatedDialog({
  open,
  onOpenChange,
  deactivationReason,
}: AccountDeactivatedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-destructive/10"
            aria-hidden="true"
          >
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl">Account Deactivated</DialogTitle>
            <DialogDescription className="text-center">
              Your account is deactivated. Please contact support.
            </DialogDescription>
          </DialogHeader>
          {deactivationReason && (
            <div className="w-full rounded-md border border-destructive/30 bg-destructive/5 p-3 text-left">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-destructive">
                Reason
              </p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {deactivationReason}
              </p>
            </div>
          )}
          <DialogFooter className="w-full pt-2">
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
