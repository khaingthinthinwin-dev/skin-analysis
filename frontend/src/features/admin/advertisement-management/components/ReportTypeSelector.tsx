import { BarChart3, FileDown, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import type { ReportType } from '@/types/admin-ad-management'

const REPORT_TYPES: Array<{
  value: ReportType
  label: string
  description: string
  icon: typeof BarChart3
}> = [
  {
    value: 'ad_performance',
    label: 'Ad Performance',
    description: 'Approved ads with payments and stats',
    icon: BarChart3,
  },
  {
    value: 'submission_history',
    label: 'Submission History',
    description: 'All advertisement submissions',
    icon: History,
  },
  {
    value: 'fee_history',
    label: 'Fee History',
    description: 'Fee setting change records',
    icon: FileDown,
  },
]

interface ReportTypeSelectorProps {
  value: ReportType
  onChange: (value: ReportType) => void
}

export function ReportTypeSelector({ value, onChange }: ReportTypeSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {REPORT_TYPES.map((report) => {
        const Icon = report.icon
        const selected = value === report.value
        return (
          <Card
            key={report.value}
            className={cn(
              'cursor-pointer p-4 transition-colors hover:border-primary/50',
              selected && 'border-primary bg-primary/5',
            )}
            onClick={() => onChange(report.value)}
            role="button"
            aria-pressed={selected}
            aria-label={report.label}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{report.label}</p>
                <p className="text-xs text-muted-foreground">{report.description}</p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}