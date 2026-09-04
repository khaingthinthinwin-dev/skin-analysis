import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface GuestLoginModalProps {
  open: boolean;
  onClose: () => void;
  messageKey: 'wishlist' | 'cart';
  returnUrl?: string;
}

export function GuestLoginModal({
  open,
  onClose,
  messageKey,
  returnUrl,
}: GuestLoginModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const targetPath = returnUrl || window.location.pathname;

  const handleLogin = useCallback(() => {
    navigate(`/login?redirect=${encodeURIComponent(targetPath)}`);
  }, [navigate, targetPath]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t(`${messageKey}.guestLoginAlert.title`)}
          </DialogTitle>
          <DialogDescription>
            {t(`${messageKey}.guestLoginAlert.message`)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose}>
            {t(`${messageKey}.guestLoginAlert.closeButton`)}
          </Button>
          <Button onClick={handleLogin}>
            {t(`${messageKey}.guestLoginAlert.loginButton`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
