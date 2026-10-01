import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { useExportReport, useExportHistoryReport } from '../hooks/useExportReport'
import { cn } from '@/lib/utils'

interface ExportReportButtonProps {
  analysisId?: string
  variant?: 'single' | 'history'
  iconOnly?: boolean
  className?: string
  children?: React.ReactNode
}

export function ExportReportButton({
  analysisId,
  variant = 'single',
  iconOnly = false,
  className,
  children,
}: ExportReportButtonProps) {
  const { t } = useTranslation('skin')
  const exportSingle = useExportReport()
  const exportAll = useExportHistoryReport()

  const isSingle = variant === 'single'
  const isPending = isSingle ? exportSingle.isPending : exportAll.isPending

  const handleClick = () => {
    if (isSingle) {
      if (analysisId) exportSingle.mutate(analysisId)
    } else {
      exportAll.mutate()
    }
  }

  const label = isSingle ? t('export.single') : t('export.history')

  return (
    <Button
      variant={iconOnly ? 'ghost' : undefined}
      size={iconOnly ? 'icon' : undefined}
      onClick={handleClick}
      disabled={isPending || (isSingle && !analysisId)}
      className={cn(iconOnly ? 'h-8 w-8 text-muted-foreground hover:text-foreground' : 'gap-2', className)}
      title={label}
      aria-label={label}
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {!iconOnly && t('common.exporting')}
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          {!iconOnly && label}
        </>
      )}
      {children}
    </Button>
  )
}