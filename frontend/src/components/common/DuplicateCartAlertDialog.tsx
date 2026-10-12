import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface DuplicateCartAlertDialogProps {
  open: boolean;
  onClose: () => void;
}

export function DuplicateCartAlertDialog({
  open,
  onClose,
}: DuplicateCartAlertDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('buyer.products.cart.alreadyInCartTitle', 'Already in Cart')}</DialogTitle>
          <DialogDescription>
            {t('buyer.products.cart.alreadyInCartDescription', 'This product is already in cart.')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={onClose}>{t('buyer.products.actions.ok', 'OK')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
