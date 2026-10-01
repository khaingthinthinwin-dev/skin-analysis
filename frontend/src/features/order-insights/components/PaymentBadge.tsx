'use client';

import { useTranslation } from 'react-i18next';
import { PaymentStatus } from '../types/orderInsights.types';

interface PaymentBadgeProps {
  status: PaymentStatus;
  className?: string;
}

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 oidark:bg-amber-950 oidark:text-amber-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 oidark:bg-emerald-950 oidark:text-emerald-300',
};

export function PaymentBadge({ status, className = '' }: PaymentBadgeProps) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${PAYMENT_STYLES[status]} ${className}`}
    >
      {t(`common.paymentStatus.${status}`, status)}
    </span>
  );
}
