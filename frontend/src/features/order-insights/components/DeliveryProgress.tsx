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

type StepState = 'done' | 'current' | 'upcoming';

const CIRCLE_STYLES: Record<StepState, string> = {
  done: 'border-[#7c3aed] bg-[#7c3aed] text-white',
  current: 'border-[#7c3aed] bg-[#7c3aed] text-white shadow-[0_0_0_6px_rgba(124,58,237,0.15)]',
  upcoming: 'border-border bg-muted text-muted-foreground',
};

const LABEL_STYLES: Record<StepState, string> = {
  done: 'text-foreground',
  current: 'text-foreground',
  upcoming: 'text-muted-foreground',
};

interface DeliveryProgressProps {
  currentStatus: OrderStatus;
}

export function DeliveryProgress({ currentStatus }: DeliveryProgressProps) {
  const { t } = useTranslation();

  const currentIndex = STEP_ORDER.indexOf(currentStatus);
  const states: StepState[] = STEP_ORDER.map((_, index) => {
    if (index < currentIndex) return 'done';
    if (index === currentIndex) return 'current';
    return 'upcoming';
  });

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
              const state = states[index];
              const connectorIsActive =
                index > 0 && states[index - 1] === 'done' && state !== 'upcoming';

              return (
                <Fragment key={status}>
                  {index > 0 && (
                    <div
                      className={`mt-[17px] h-0.5 min-w-6 flex-1 rounded-full ${connectorIsActive ? 'bg-[#7c3aed]' : 'bg-[#e5e7eb]'}`}
                      aria-hidden="true"
                    />
                  )}
                  <li
                    className="flex min-w-[86px] flex-1 flex-col items-center"
                    aria-current={state === 'current' ? 'step' : undefined}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${CIRCLE_STYLES[state]}`}
                      aria-hidden="true"
                    >
                      {(state === 'done' || state === 'current') && (
                        <Check className="h-4 w-4" strokeWidth={3} />
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