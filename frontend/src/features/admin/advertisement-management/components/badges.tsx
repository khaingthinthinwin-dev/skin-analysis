import { Badge } from '@/components/ui/badge'
import type { ApprovalStatus, PaymentStatus, Tier } from '@/types/admin-ad-management'

const STATUS_STYLES: Record<ApprovalStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  approved: 'bg-green-100 text-green-800 hover:bg-green-100',
  rejected: 'bg-red-100 text-red-800 hover:bg-red-100',
}

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  completed: 'bg-green-100 text-green-800 hover:bg-green-100',
  pending: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  refunded: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
}

const TIER_STYLES: Record<Tier, string> = {
  basic: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  standard: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  premium: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
}

export function StatusBadge({ status }: { status: ApprovalStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {status}
    </Badge>
  )
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant="outline" className={PAYMENT_STYLES[status]}>
      {status}
    </Badge>
  )
}

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <Badge variant="outline" className={TIER_STYLES[tier]}>
      {tier}
    </Badge>
  )
}

export function FeeStatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={active ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-100'}
    >
      {active ? 'Active' : 'Inactive'}
    </Badge>
  )
}