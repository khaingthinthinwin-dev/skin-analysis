import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { X, ChevronUp, ChevronDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SEVERITY_COLORS, CONDITION_LABELS } from '../types/skin-analysis.types'
import { useCompareAnalysesQuery } from '../hooks/useCompareAnalyses'
import type { ComparisonResult, ConditionChangeDto } from '../types/skin-analysis.types'

interface AnalysisComparisonModalProps {
  open: boolean
  onClose: () => void
  analysisId1: string
  analysisId2: string
}

const DIRECTION_ICONS = {
  IMPROVED: ChevronUp,
  REGRESSED: ChevronDown,
  STABLE: Minus,
}

const DIRECTION_COLORS = {
  IMPROVED: 'text-emerald-600 dark:text-emerald-400',
  REGRESSED: 'text-red-600 dark:text-red-400',
  STABLE: 'text-amber-600 dark:text-amber-400',
}

const DIRECTION_LABELS = {
  IMPROVED: 'improved',
  REGRESSED: 'regressed',
  STABLE: 'stable',
}

export function AnalysisComparisonModal({ open, onClose, analysisId1, analysisId2 }: AnalysisComparisonModalProps) {
  const { t } = useTranslation('skin')
  const { data, isLoading, error } = useCompareAnalysesQuery(analysisId1, analysisId2)

  if (!open) return null

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getSeverityBadge = (severity: string) => {
    const colors = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.NONE
    return (
      <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border}`}>
        {severity}
      </Badge>
    )
  }

  const getDirectionBadge = (direction: string) => {
    const Icon = DIRECTION_ICONS[direction as keyof typeof DIRECTION_ICONS] || Minus
    const color = DIRECTION_COLORS[direction as keyof typeof DIRECTION_COLORS] || DIRECTION_COLORS.STABLE
    const label = DIRECTION_LABELS[direction as keyof typeof DIRECTION_LABELS] || direction.toLowerCase()
    return (
      <Badge variant="outline" className={`flex items-center gap-1 ${color}`}>
        <Icon className="h-3 w-3" />
        {t(`compare.directions.${label.toLowerCase()}`)}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('compare.title')}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('compare.title')}</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-destructive">
            <p>{t('compare.loadError', { error: error.message })}</p>
          </div>
          <DialogFooter>
            <button onClick={onClose} className="btn-primary">{t('common.close')}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const comparison = data as ComparisonResult | undefined

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>{t('compare.title')}</span>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Header with dates */}
          {comparison && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                <h4 className="font-semibold mb-1">{t('compare.baseline')}</h4>
                <p className="text-sm text-muted-foreground">{formatDate(comparison.analysis1.date)}</p>
              </div>
              <div className="p-4 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800">
                <h4 className="font-semibold mb-1">{t('compare.current')}</h4>
                <p className="text-sm text-muted-foreground">{formatDate(comparison.analysis2.date)}</p>
              </div>
            </div>
          )}

          {/* Metrics Comparison */}
          {comparison && (
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>{t('compare.metrics')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('compare.metric')}</TableHead>
                      <TableHead className="text-center">{t('compare.baseline')}</TableHead>
                      <TableHead className="text-center">{t('compare.current')}</TableHead>
                      <TableHead className="text-center">{t('compare.delta')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">{t('compare.healthScore')}</TableCell>
                      <TableCell className="text-center">{comparison.analysis1.healthScore}/100</TableCell>
                      <TableCell className="text-center">{comparison.analysis2.healthScore}/100</TableCell>
                      <TableCell className="text-center">
                        <span className={cn('font-medium', comparison.scoreDelta >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {comparison.scoreDelta >= 0 ? '+' : ''}{comparison.scoreDelta}
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">{t('compare.hydration')}</TableCell>
                      <TableCell className="text-center">{comparison.analysis1.hydration}%</TableCell>
                      <TableCell className="text-center">{comparison.analysis2.hydration}%</TableCell>
                      <TableCell className="text-center">
                        <span className={cn('font-medium', comparison.hydrationDelta >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {comparison.hydrationDelta >= 0 ? '+' : ''}{comparison.hydrationDelta}%
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">{t('compare.skinAge')}</TableCell>
                      <TableCell className="text-center">{comparison.analysis1.skinAge} yrs</TableCell>
                      <TableCell className="text-center">{comparison.analysis2.skinAge} yrs</TableCell>
                      <TableCell className="text-center">
                        <span className={cn('font-medium', comparison.ageDelta <= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {comparison.ageDelta >= 0 ? '+' : ''}{comparison.ageDelta} yrs
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">{t('compare.daysBetween')}</TableCell>
                      <TableCell className="text-center" colSpan={2}>{comparison.daysBetween} {t('compare.days')}</TableCell>
                      <TableCell className="text-center">—</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Condition Changes */}
          {comparison && comparison.conditionChanges.length > 0 && (
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>{t('compare.conditionChanges')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('compare.condition')}</TableHead>
                      <TableHead className="text-center">{t('compare.baseline')}</TableHead>
                      <TableHead className="text-center">{t('compare.current')}</TableHead>
                      <TableHead className="text-center">{t('compare.direction')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.conditionChanges.map((change: ConditionChangeDto) => (
                      <TableRow key={change.conditionName}>
                        <TableCell className="font-medium">{CONDITION_LABELS[change.conditionName]}</TableCell>
                        <TableCell className="text-center">{getSeverityBadge(change.from)}</TableCell>
                        <TableCell className="text-center">{getSeverityBadge(change.to)}</TableCell>
                        <TableCell className="text-center">{getDirectionBadge(change.direction)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <button onClick={onClose} className="btn-secondary w-full sm:w-auto">
            {t('common.close')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}