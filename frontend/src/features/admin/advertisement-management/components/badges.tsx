import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import type { ApprovalStatus, PaymentStatus, Tier } from '@/types/admin-ad-management'

const STATUS_STYLES: Record<ApprovalStatus, string> = {
  pending:
    'border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/15',
  approved:
    'border-transparent bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/15',
  rejected:
    'border-transparent bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/15',
}

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  completed:
    'border-transparent bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/15',
  pending:
    'border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/15',
  refunded:
    'border-transparent bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-500/15 dark:text-gray-300 dark:hover:bg-gray-500/15',
}

const TIER_STYLES: Record<Tier, string> = {
  basic: 'border-transparent bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-500/15 dark:text-gray-300 dark:hover:bg-gray-500/15',
  standard:
    'border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/15',
  premium:
    'border-transparent bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-500/15 dark:text-purple-400 dark:hover:bg-purple-500/15',
}

export function StatusBadge({ status }: { status: ApprovalStatus }) {
  const { t } = useTranslation()
  return (
    <Badge variant="outline" className={`capitalize ${STATUS_STYLES[status]}`}>
      {t(`admin.ads.status.${status}`, status)}
    </Badge>
  )
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const { t } = useTranslation()
  return (
    <Badge variant="outline" className={`capitalize ${PAYMENT_STYLES[status]}`}>
      {t(`admin.ads.status.${status}`, status)}
    </Badge>
  )
}

export function TierBadge({ tier }: { tier: Tier }) {
  const { t } = useTranslation()
  return (
    <Badge variant="outline" className={`capitalize ${TIER_STYLES[tier]}`}>
      {t(`admin.ads.tier.${tier}`, tier)}
    </Badge>
  )
}

export function FeeStatusBadge({ active }: { active: boolean }) {
  const { t } = useTranslation()
  return (
    <Badge
      variant="outline"
      className={active ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-100'}
    >
      {active
        ? t('admin.ads.status.active', 'Active')
        : t('admin.ads.status.inactive', 'Inactive')}
    </Badge>
  )
}