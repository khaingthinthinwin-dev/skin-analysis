import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Check, ChevronRight, Ticket, Tag, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { MerchantPromotion, CouponValidation } from '@/types/checkout.types';

interface VoucherSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotions: MerchantPromotion[];
  appliedCoupon: CouponValidation | null;
  appliedCode: string | null;
  onSelectPromotion: (code: string) => Promise<void> | void;
  onRemovePromotion: () => void;
  onEnterCode: (code: string) => Promise<void> | void;
  isLoading: boolean;
  subtotal: number;
}

function formatDiscount(promo: MerchantPromotion, t: TFunction): string {
  if (promo.discountType === 'percentage') {
    return t('buyer.checkout.vouchers.percentOff', '{{value}}% OFF', {
      value: promo.discountValue,
    });
  }
  return t('buyer.checkout.vouchers.amountOff', '{{amount}}Ks OFF', {
    amount: Math.round(Number(promo.discountValue)).toLocaleString('en-US'),
  });
}

function formatMinOrder(amount: string | null, t: TFunction): string {
  if (!amount) return '';
  return t('buyer.checkout.vouchers.minOrder', 'Min. order {{amount}}Ks', {
    amount: Math.round(Number(amount)).toLocaleString('en-US'),
  });
}

function getExpiryLabel(expiresAt: string, t: TFunction): string {
  const exp = new Date(expiresAt);
  const now = new Date();
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return t('buyer.checkout.vouchers.expired', 'Expired');
  if (diffDays === 1) return t('buyer.checkout.vouchers.expiresToday', 'Expires today');
  if (diffDays <= 7) {
    return t('buyer.checkout.vouchers.expiresInDays', 'Expires in {{count}} days', {
      count: diffDays,
    });
  }
  return t('buyer.checkout.vouchers.expiresOn', 'Expires {{date}}', {
    date: exp.toLocaleDateString(),
  });
}

/** Extract a human-readable message from an Axios-style error */
function extractErrorMessage(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as Record<string, unknown>;
  // Axios error shape
  const response = e['response'] as Record<string, unknown> | undefined;
  if (response) {
    const data = response['data'] as Record<string, unknown> | undefined;
    if (data?.message && typeof data.message === 'string') return data.message;
    if (data?.error && typeof data.error === 'string') return data.error;
  }
  if (typeof e['message'] === 'string') return e['message'];
  return null;
}

export function VoucherSelectionModal({
  open,
  onOpenChange,
  promotions,
  appliedCoupon,
  appliedCode,
  onSelectPromotion,
  onRemovePromotion,
  onEnterCode,
  isLoading,
  subtotal,
}: VoucherSelectionModalProps) {
  const { t } = useTranslation();
  const [manualCode, setManualCode] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(appliedCode);
  const [manualError, setManualError] = useState<string | null>(null);

  const handleApplyManual = async () => {
    const code = manualCode.trim();
    if (!code) return;
    setManualError(null);
    try {
      await onEnterCode(code);
      setSelectedCode(code);
      onOpenChange(false);
    } catch (err) {
      const msg =
        extractErrorMessage(err) ??
        t('buyer.checkout.vouchers.invalidCode', 'Invalid coupon code');
      setManualError(msg);
    }
  };

  const handleSelectPromo = async (code: string) => {
    try {
      await onSelectPromotion(code);
      setSelectedCode(code);
      onOpenChange(false);
    } catch {
      // selection errors are handled by the parent (toast)
    }
  };

  const handleRemove = () => {
    setSelectedCode(null);
    onRemovePromotion();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[480px] p-5">
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Ticket className="h-5 w-5 text-primary" />
            {t('buyer.checkout.vouchers.shopVouchersTitle', 'Shop Vouchers')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'buyer.checkout.vouchers.selectOrEnterCode',
              'Select a voucher or enter a code to apply a discount.',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1 pb-1">
          {appliedCoupon && appliedCode && (
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                      {formatDiscount(
                        { discountType: appliedCoupon.discountType, discountValue: appliedCoupon.discountValue } as MerchantPromotion,
                        t,
                      )}
                    </span>
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-mono font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      {appliedCode.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">
                    {t('buyer.checkout.vouchers.appliedBadge', 'applied')}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemove} className="text-green-700 hover:text-green-900 dark:text-green-300">
                {t('buyer.checkout.vouchers.remove', 'Remove')}
              </Button>
            </div>
          )}

          {promotions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('buyer.checkout.vouchers.availableVouchers', 'Available Vouchers')}
              </p>
              <RadioGroup
                value={selectedCode ?? undefined}
                onValueChange={(value) => handleSelectPromo(value)}
              >
                {promotions
                  .filter((promo) => {
                    // Hide only globally exhausted promotions (no capacity left at all)
                    if (promo.maxUses != null && promo.usedCount != null && promo.usedCount >= promo.maxUses) {
                      return false;
                    }
                    if (new Date(promo.expiresAt) <= new Date()) {
                      return false;
                    }
                    return true;
                  })
                  .map((promo) => {
                    const isSelected = selectedCode === promo.code;
                    const meetsMin = !promo.minOrderAmount || subtotal >= Number.parseFloat(promo.minOrderAmount);
                    const alreadyUsed = !!promo.userAlreadyUsed;
                    const isDisabled = !meetsMin || alreadyUsed;

                    return (
                      <Label
                        key={promo.id}
                        htmlFor={`promo-${promo.id}`}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                          alreadyUsed
                            ? 'border-border bg-muted/40 opacity-60 cursor-not-allowed'
                            : isSelected
                              ? 'border-primary bg-primary/5'
                              : meetsMin
                                ? 'border-border hover:border-primary/50 cursor-pointer'
                                : 'border-border opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <RadioGroupItem
                          value={promo.code}
                          id={`promo-${promo.id}`}
                          disabled={isDisabled}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold ${alreadyUsed ? 'text-muted-foreground' : 'text-primary'}`}>
                              {formatDiscount(promo, t)}
                            </span>
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-medium">
                              {promo.code}
                            </span>
                            {alreadyUsed && (
                              <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                <AlertCircle className="h-3 w-3" />
                                {t('buyer.checkout.vouchers.alreadyUsed', 'Already used')}
                              </span>
                            )}
                          </div>
                          {promo.description && (
                            <p className="mt-0.5 text-xs text-muted-foreground truncate">
                              {promo.description}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            {promo.minOrderAmount && (
                              <span className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {formatMinOrder(promo.minOrderAmount, t)}
                              </span>
                            )}
                            <span>{getExpiryLabel(promo.expiresAt, t)}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Label>
                    );
                  })}
              </RadioGroup>
            </div>
          )}

          {promotions.length === 0 && !appliedCoupon && (
            <div className="flex flex-col items-center py-6 text-center">
              <Ticket className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {t(
                  'buyer.checkout.vouchers.noVouchersAvailable',
                  'No vouchers available for this shop',
                )}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('buyer.checkout.vouchers.haveACode', 'Have a code?')}
            </p>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  value={manualCode}
                  onChange={(e) => {
                    setManualCode(e.target.value);
                    if (manualError) setManualError(null);
                  }}
                  placeholder={t('buyer.checkout.vouchers.enterCouponCode', 'Enter coupon code')}
                  aria-label={t('buyer.checkout.vouchers.couponCodeAria', 'Coupon code')}
                  aria-describedby={manualError ? 'coupon-error' : undefined}
                  aria-invalid={!!manualError}
                  disabled={isLoading}
                  className={manualError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyManual();
                    }
                  }}
                />
                {manualError && (
                  <p
                    id="coupon-error"
                    role="alert"
                    className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {manualError}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleApplyManual}
                disabled={!manualCode.trim() || isLoading}
                className="self-start"
              >
                {isLoading
                  ? t('buyer.checkout.vouchers.applying', 'Applying...')
                  : t('buyer.checkout.vouchers.apply', 'Apply')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
