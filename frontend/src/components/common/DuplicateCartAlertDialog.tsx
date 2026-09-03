import { CircleAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DuplicateCartAlertDialogProps {
  open: boolean;
  onClose: () => void;
}

export function DuplicateCartAlertDialog({
  open,
  onClose,
}: DuplicateCartAlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <CircleAlert className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center">Product already in cart</DialogTitle>
          <DialogDescription className="text-center">
            This product is already in cart.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} className="w-full sm:w-auto">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
