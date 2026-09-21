import { useState } from 'react';
import { Check, ChevronRight, Ticket, Tag } from 'lucide-react';
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
  onSelectPromotion: (code: string) => void;
  onRemovePromotion: () => void;
  onEnterCode: (code: string) => void;
  isLoading: boolean;
  subtotal: number;
}

function formatDiscount(promo: MerchantPromotion): string {
  if (promo.discountType === 'percentage') {
    return `${promo.discountValue}% OFF`;
  }
  return `${Number(promo.discountValue).toLocaleString()} MMK OFF`;
}

function formatMinOrder(amount: string | null): string {
  if (!amount) return '';
  return `Min. order ${Number(amount).toLocaleString()} MMK`;
}

function getExpiryLabel(expiresAt: string): string {
  const exp = new Date(expiresAt);
  const now = new Date();
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Expired';
  if (diffDays === 1) return 'Expires today';
  if (diffDays <= 7) return `Expires in ${diffDays} days`;
  return `Expires ${exp.toLocaleDateString()}`;
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
  const [manualCode, setManualCode] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(appliedCode);

  const handleApplyManual = () => {
    const code = manualCode.trim();
    if (code) {
      setSelectedCode(code);
      onEnterCode(code);
      onOpenChange(false);
    }
  };

  const handleSelectPromo = (code: string) => {
    setSelectedCode(code);
    onSelectPromotion(code);
    onOpenChange(false);
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
            Shop Vouchers
          </DialogTitle>
          <DialogDescription>
            Select a voucher or enter a code to apply a discount.
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
                      {formatDiscount({ discountType: appliedCoupon.discountType, discountValue: appliedCoupon.discountValue } as MerchantPromotion)}
                    </span>
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-mono font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      {appliedCode.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">
                    applied
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemove} className="text-green-700 hover:text-green-900 dark:text-green-300">
                Remove
              </Button>
            </div>
          )}

          {promotions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Available Vouchers
              </p>
              <RadioGroup
                value={selectedCode ?? undefined}
                onValueChange={(value) => handleSelectPromo(value)}
              >
                {promotions
                  .filter((promo) => {
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
                    return (
                      <Label
                        key={promo.id}
                        htmlFor={`promo-${promo.id}`}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : meetsMin
                              ? 'border-border hover:border-primary/50 cursor-pointer'
                              : 'border-border opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <RadioGroupItem
                          value={promo.code}
                          id={`promo-${promo.id}`}
                          disabled={!meetsMin}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-primary">
                              {formatDiscount(promo)}
                            </span>
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-medium">
                              {promo.code}
                            </span>
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
                                {formatMinOrder(promo.minOrderAmount)}
                              </span>
                            )}
                            <span>{getExpiryLabel(promo.expiresAt)}</span>
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
              <p className="text-sm text-muted-foreground">No vouchers available for this shop</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Have a code?
            </p>
            <div className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter coupon code"
                aria-label="Coupon code"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyManual();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleApplyManual}
                disabled={!manualCode.trim() || isLoading}
              >
                {isLoading ? 'Applying...' : 'Apply'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
