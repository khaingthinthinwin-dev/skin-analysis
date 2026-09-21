import { useState } from 'react';
import { ChevronRight, Ticket } from 'lucide-react';
import { VoucherSelectionModal } from './VoucherSelectionModal';
import { useMerchantPromotions } from '../hooks/useCheckout';
import type { MerchantPromotion, CouponValidation } from '@/types/checkout.types';

interface ShopVoucherRowProps {
  merchantId: string;
  appliedCoupon: CouponValidation | null;
  appliedCode: string | null;
  onSelectPromotion: (code: string) => void;
  onRemovePromotion: () => void;
  onEnterCode: (code: string) => void;
  isCouponLoading: boolean;
  subtotal: number;
}

function formatDiscountText(promo: MerchantPromotion): string {
  if (promo.discountType === 'percentage') {
    return `-${promo.discountValue}%`;
  }
  return `${Number(promo.discountValue).toLocaleString()} MMK`;
}

export function ShopVoucherRow({
  merchantId,
  appliedCoupon,
  appliedCode,
  onSelectPromotion,
  onRemovePromotion,
  onEnterCode,
  isCouponLoading,
  subtotal,
}: ShopVoucherRowProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: promotions = [] } = useMerchantPromotions(merchantId);

  const getDisplayText = (): { label: string; hasDiscount: boolean } => {
    if (appliedCoupon && appliedCode) {
      const matchedPromo = promotions.find(
        (p) => p.code.toUpperCase() === appliedCode.toUpperCase(),
      );
      if (matchedPromo) {
        return { label: formatDiscountText(matchedPromo), hasDiscount: true };
      }
      return { label: `-${appliedCoupon.discountAmount}`, hasDiscount: true };
    }
    if (promotions.length > 0) {
      return { label: 'Select', hasDiscount: false };
    }
    return { label: 'Enter code', hasDiscount: false };
  };

  const display = getDisplayText();

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex w-full items-center justify-between rounded-lg border border-dashed border-purple-200 bg-[#FDF4FF] px-3 py-2 text-sm transition-colors hover:border-purple-300 hover:bg-[#FAF0FF] dark:border-purple-800 dark:bg-purple-950/20 dark:hover:border-purple-700 dark:hover:bg-purple-950/30"
      >
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-purple-500 dark:text-purple-400" />
          <span className="font-medium text-purple-700 dark:text-purple-300">
            Shop Voucher
          </span>
        </div>
        <div className="flex items-center gap-1">
          {display.hasDiscount ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
              {display.label}
            </span>
          ) : (
            <span className="text-xs font-medium text-primary">
              {display.label}
            </span>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-purple-400 dark:text-purple-500" />
        </div>
      </button>

      <VoucherSelectionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        promotions={promotions}
        appliedCoupon={appliedCoupon}
        appliedCode={appliedCode}
        onSelectPromotion={onSelectPromotion}
        onRemovePromotion={onRemovePromotion}
        onEnterCode={onEnterCode}
        isLoading={isCouponLoading}
        subtotal={subtotal}
      />
    </>
  );
}
