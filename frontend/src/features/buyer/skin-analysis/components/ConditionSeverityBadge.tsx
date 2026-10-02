import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { SEVERITY_COLORS, CONDITION_LABELS } from '../types/skin-analysis.types'
import type { ConditionSeverity, ConditionName } from '../types/skin-analysis.types'

interface ConditionSeverityBadgeProps {
  conditionName: ConditionName
  severity: ConditionSeverity
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ConditionSeverityBadge({
  conditionName,
  severity,
  showLabel = true,
  size = 'md',
}: ConditionSeverityBadgeProps) {
  const colors = SEVERITY_COLORS[severity]
  const label = showLabel ? `${CONDITION_LABELS[conditionName]}: ${colors.label}` : colors.label

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        colors.bg,
        colors.text,
        colors.border,
        sizeClasses[size],
        'font-medium',
      )}
    >
      {label}
    </Badge>
  )
}

// Compact version for inline use
export function CompactConditionBadge({ conditionName, severity }: { conditionName: ConditionName; severity: ConditionSeverity }) {
  const colors = SEVERITY_COLORS[severity]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        colors.bg,
        colors.text,
        colors.border,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.text.replace('text-', '') }} />
      {CONDITION_LABELS[conditionName]}
    </span>
  )
}