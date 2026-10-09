'use client';

import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, PackageCheck, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatus } from '../types/orderInsights.types';
import { toSlashDisplayDate } from '../utils/dateRangeLabel';

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
  upcoming: 'border-border bg-muted text-muted-foreground dark:border-[#514b5a] dark:bg-[#211a29] dark:text-slate-300',
};

const LABEL_STYLES: Record<StepState, string> = {
  done: 'text-foreground dark:text-slate-100',
  current: 'text-foreground dark:text-slate-100',
  next: 'text-foreground dark:text-slate-100',
  upcoming: 'text-muted-foreground dark:text-slate-300',
};

interface DeliveryProgressProps {
  currentStatus: OrderStatus;
  /**
   * The buyer gets a prominent current step and overall progress count. The
   * merchant gets history timestamps and an explicit upcoming "Next" step.
   */
  variant?: 'buyer' | 'merchant';
  /**
   * ISO timestamps keyed by status from `order_status_history` (tracking
   * endpoint). Steps without an entry simply hide the caption — timestamps are
   * never invented (BR-OI-014).
   */
  timestamps?: Partial<Record<OrderStatus, string>>;
}

export function DeliveryProgress({
  currentStatus,
  variant = 'buyer',
  timestamps,
}: DeliveryProgressProps) {
  const { t, i18n } = useTranslation();
  const isMerchant = variant === 'merchant';
  const isBuyer = variant === 'buyer';
  const dateLocale = i18n.resolvedLanguage || i18n.language || 'en-US';

  const currentIndex = STEP_ORDER.indexOf(currentStatus);
  const stepState = (index: number): StepState => {
    if (index < currentIndex) return 'done';
    if (index === currentIndex) return isMerchant ? 'done' : 'current';
    if (isMerchant && currentIndex >= 0 && index === currentIndex + 1) return 'next';
    return 'upcoming';
  };

  return (
    <Card className="border-border/80 shadow-xs dark:border-[#29252f] dark:bg-[#111014] oidark:border-outline-variant oidark:bg-surface-container-low">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base dark:text-slate-100 oidark:text-slate-100">
            <Truck className="h-4 w-4 text-purple-600 oidark:text-primary" aria-hidden="true" />
            {t('orders.detail.deliveryProgress', 'Delivery progress')}
          </CardTitle>
          {isBuyer && currentIndex >= 0 && (
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              {t('orders.detail.progressStepCount', `Step ${currentIndex + 1} of ${STEP_ORDER.length}`, { current: currentIndex + 1, total: STEP_ORDER.length })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-5 pt-2">
        <div className="overflow-x-auto">
          <ol className="mx-auto flex min-w-[620px] items-start px-2">
            {STEP_ORDER.map((status, index) => {
              const state = stepState(index);
              // A connector turns purple once it leads into a reached step.
              const connectorIsActive = index <= currentIndex;
              const timestamp = timestamps?.[status];
              const stampDate = timestamp && toSlashDisplayDate(timestamp);
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
                      {(state === 'done' || (state === 'current' && isMerchant)) && (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      )}
                      {isBuyer && state === 'current' && (
                        <PackageCheck className="h-5 w-5" strokeWidth={2.5} />
                      )}
                      {state === 'upcoming' && (
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
                    {isBuyer && state === 'current' && (
                      <span className="mt-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                        {t('orders.detail.currentStep', 'Current')}
                      </span>
                    )}
                    {(state === 'done' || (isBuyer && state === 'current')) && stampDate && stampTime && (
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
