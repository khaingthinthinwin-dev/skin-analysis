'use client';

import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatus } from '../types/orderInsights.types';

const STEP_ORDER: OrderStatus[] = [
  OrderStatus.PLACED,
  OrderStatus.CONFIRMED,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

type StepState = 'done' | 'current' | 'next' | 'upcoming';

const CIRCLE_STYLES: Record<StepState, string> = {
  done: 'border-[#7c3aed] bg-[#7c3aed] text-white',
  current: 'border-[#7c3aed] bg-[#7c3aed] text-white shadow-[0_0_0_6px_rgba(124,58,237,0.15)]',
  // Dashed outline marks the upcoming "Next" step in the merchant variant.
  next: 'border-2 border-dashed border-[#7c3aed] bg-transparent text-[#7c3aed]',
  upcoming: 'border-border bg-muted text-muted-foreground',
};

const LABEL_STYLES: Record<StepState, string> = {
  done: 'text-foreground',
  current: 'text-foreground',
  next: 'text-foreground',
  upcoming: 'text-muted-foreground',
};

interface DeliveryProgressProps {
  currentStatus: OrderStatus;
  /**
   * Merchant variant: the reached step renders as done, the following step as a
   * dashed "Next" outline, and later steps show their step number. The default
   * variant keeps the original rendering so the buyer page is unchanged.
   */
  variant?: 'default' | 'merchant';
  /**
   * ISO timestamps keyed by status from `order_status_history` (tracking
   * endpoint). Steps without an entry simply hide the caption — timestamps are
   * never invented (BR-OI-014).
   */
  timestamps?: Partial<Record<OrderStatus, string>>;
}

export function DeliveryProgress({
  currentStatus,
  variant = 'default',
  timestamps,
}: DeliveryProgressProps) {
  const { t, i18n } = useTranslation();
  const isMerchant = variant === 'merchant';
  const dateLocale = i18n.resolvedLanguage || i18n.language || 'en-US';

  const currentIndex = STEP_ORDER.indexOf(currentStatus);
  const stepState = (index: number): StepState => {
    if (index < currentIndex) return 'done';
    if (index === currentIndex) return isMerchant ? 'done' : 'current';
    if (isMerchant && currentIndex >= 0 && index === currentIndex + 1) return 'next';
    return 'upcoming';
  };

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4 text-purple-600" aria-hidden="true" />
          {t('orders.detail.deliveryProgress', 'Delivery progress')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5 pt-2">
        <div className="overflow-x-auto">
          <ol className="mx-auto flex min-w-[620px] items-start px-2">
            {STEP_ORDER.map((status, index) => {
              const state = stepState(index);
              // A connector turns purple once it leads into a reached step —
              // identical to the original rule for the default variant.
              const connectorIsActive = index <= currentIndex;
              const timestamp = timestamps?.[status];
              const stampDate =
                timestamp &&
                new Date(timestamp).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
              const stampTime =
                timestamp &&
                new Date(timestamp).toLocaleTimeString(dateLocale, {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });

              return (
                <Fragment key={status}>
                  {index > 0 && (
                    <div
                      className={`mt-[17px] h-0.5 min-w-6 flex-1 rounded-full ${connectorIsActive ? 'bg-[#7c3aed]' : 'bg-[#e5e7eb] oidark:bg-outline-variant'}`}
                      aria-hidden="true"
                    />
                  )}
                  <li
                    className="flex min-w-[86px] flex-1 flex-col items-center"
                    aria-current={index === currentIndex ? 'step' : undefined}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${CIRCLE_STYLES[state]}`}
                      aria-hidden="true"
                    >
                      {(state === 'done' || state === 'current') && (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      )}
                      {isMerchant && state === 'upcoming' && (
                        <span className="text-xs font-bold text-[#4b5563] dark:text-[#d1d5db] oidark:text-[#d1d5db]">
                          {index + 1}
                        </span>
                      )}
                    </span>
                    <span
                      className={`mt-2 flex items-start justify-center text-center text-xs font-semibold leading-tight ${LABEL_STYLES[state]}`}
                    >
                      {t(
                        `common.status.${status}`,
                        status.replaceAll('_', ' ').replace(/^./, (char) => char.toUpperCase()),
                      )}
                    </span>
                    {state === 'next' && (
                      <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7c3aed]">
                        {t('orders.detail.nextStep', 'Next')}
                      </span>
                    )}
                    {state === 'done' && stampDate && stampTime && (
                      <span className="mt-1 text-center text-[11px] font-normal leading-tight text-muted-foreground">
                        {stampDate}
                        <br />
                        {stampTime}
                      </span>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}