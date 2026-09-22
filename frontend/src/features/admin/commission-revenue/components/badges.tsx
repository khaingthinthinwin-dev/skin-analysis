import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AdFeePaymentStatus, PaymentStatus, Payout } from '../services/commission.service';

// ---------------------------------------------------------------------------
// Central status badge colours for the Commission & Revenue screens.
//
// Colours MUST NOT be set independently per component. They are defined once
// here and follow DEVELOPMENT_RULES §9.6 (Status Badges):
//   success    (green)  -> bg-green-100 text-green-800
//   pending    (amber)  -> bg-amber-100 text-amber-800
//   neutral    (gray)   -> bg-gray-100 text-gray-800
//   processing (purple) -> bg-purple-100 text-purple-800
//   danger     (red)    -> bg-red-100 text-red-800
// ---------------------------------------------------------------------------
type StatusTone = 'success' | 'pending' | 'neutral' | 'processing' | 'danger';

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  neutral: 'bg-gray-100 text-gray-800',
  processing: 'bg-purple-100 text-purple-800',
  danger: 'bg-red-100 text-red-800',
};

// Payout status -> tone (§9.6: completed = green, pending = amber,
// processing = purple, failed = red). The annotation keeps this exhaustive.
const PAYOUT_STATUS_TONES: Record<Payout['status'], StatusTone> = {
  pending: 'pending',
  processing: 'processing',
  completed: 'success',
  failed: 'danger',
};

// Order / ad-fee payment counters -> tone (§9.6: completed = green,
// pending = amber, refunded = gray). `satisfies` keeps this exhaustive for
// every counter returned by both payment-status endpoints.
const PAYMENT_STATUS_TONES = {
  completed: 'success',
  pending: 'pending',
  refunded: 'neutral',
} satisfies Record<keyof PaymentStatus | keyof AdFeePaymentStatus, StatusTone>;

// Status key shared by the order-payment and ad-payment counters.
type PaymentStatusKind = keyof PaymentStatus | keyof AdFeePaymentStatus;

// Canonical display labels so the pill text is defined once, not per card.
const PAYMENT_STATUS_LABELS: Record<PaymentStatusKind, string> = {
  completed: 'Completed',
  pending: 'Pending',
  refunded: 'Refunded',
};

interface StatusBadgeProps {
  tone: StatusTone;
  className?: string;
  children: React.ReactNode;
}

// Shared renderer – every status badge in this feature goes through here so the
// colour always comes from the §9.6 registry above.
const StatusBadge: React.FC<StatusBadgeProps> = ({ tone, className, children }) => (
  <Badge variant="outline" className={cn(TONE_CLASSES[tone], className)}>
    {children}
  </Badge>
);

// Merchant payout row status (e.g. "pending", "completed", "failed").
export const PayoutStatusBadge: React.FC<{
  status: Payout['status'];
  className?: string;
}> = ({ status, className }) => (
  <StatusBadge tone={PAYOUT_STATUS_TONES[status]} className={className}>
    {status}
  </StatusBadge>
);

// Payment status pill, e.g. "Completed" / "Pending" / "Refunded".
// Pass children to override the label (e.g. "3 completed orders").
export const PaymentStatusBadge: React.FC<{
  kind: PaymentStatusKind;
  className?: string;
  children?: React.ReactNode;
}> = ({ kind, className, children }) => (
  <StatusBadge tone={PAYMENT_STATUS_TONES[kind]} className={className}>
    {children ?? PAYMENT_STATUS_LABELS[kind]}
  </StatusBadge>
);

// Two-line status stat: the count on top (plain foreground colour, sized like
// the Ad Fee Summary card numbers) with the coloured status pill underneath.
export const PaymentStatusStat: React.FC<{
  kind: PaymentStatusKind;
  value: number | string;
}> = ({ kind, value }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-2xl font-bold">{value}</span>
    <PaymentStatusBadge kind={kind} />
  </div>
);

