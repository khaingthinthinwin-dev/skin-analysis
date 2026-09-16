'use client';

import { useTranslation } from 'react-i18next';
import { OrderStatus } from '../types/orderInsights.types';

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  [OrderStatus.PLACED]: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  [OrderStatus.CONFIRMED]: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  [OrderStatus.PACKED]: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  [OrderStatus.SHIPPED]: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  [OrderStatus.OUT_FOR_DELIVERY]: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  [OrderStatus.DELIVERED]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_STYLES[status]} ${className}`}
    >
      {t(`common.status.${status}`, status.replaceAll('_', ' '))}
    </span>
  );
}
