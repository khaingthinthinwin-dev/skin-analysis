import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Download,
  Droplets,
  FileText,
  Eye,
  TrendingUp,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAnalysisHistory } from '../hooks/useAnalysisHistory'
import { useDeleteAnalysis, useDeleteAnalyses } from '../hooks/useDeleteAnalysis'
import type { HistoryQueryParams } from '@/schemas/skin-analysis.schema'
import { SKIN_TYPE_LABELS } from '../types/skin-analysis.types'
import { useExportReport, useExportHistoryReport } from '../hooks/useExportReport'

interface AnalysisHistoryTableProps {
  initialParams?: Partial<HistoryQueryParams>
}

export function AnalysisHistoryTable({ initialParams = {} }: AnalysisHistoryTableProps) {
  const { t } = useTranslation('skin')

  const [params, setParams] = useState<HistoryQueryParams>({
    page: initialParams.page ?? 1,
    pageSize: initialParams.pageSize ?? 10,
    dateFrom: initialParams.dateFrom,
    dateTo: initialParams.dateTo,
  })

  // ── Selection state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<{
    mode: 'single' | 'bulk'
    ids: string[]
  } | null>(null)

  // ── Data & mutations ─────────────────────────────────────────────────────
  const exportSingle = useExportReport()
  const exportAll = useExportHistoryReport()
  const deleteSingle = useDeleteAnalysis()
  const deleteBulk = useDeleteAnalyses()

  const { data, isLoading, error, refetch } = useAnalysisHistory(params)

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  const handleExportSingle = async (analysisId: string) => {
    try {
      await exportSingle.mutateAsync(analysisId)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const handleExportAll = async () => {
    try {
      await exportAll.mutateAsync()
    } catch (err) {
      console.error('Export all failed:', err)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      PROCESSING: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    }
    return (
      <Badge variant="outline" className={colors[status] || 'bg-muted text-muted-foreground'}>
        {status}
      </Badge>
    )
  }

  // ── Selection handlers ────────────────────────────────────────────────────
  const allIds = useMemo(
    () => data?.items.map((i) => i.analysisId) ?? [],
    [data?.items],
  )
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id))
  const someSelected = allIds.some((id) => selectedIds.has(id))

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }, [allSelected, allIds])

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ── Delete handlers ───────────────────────────────────────────────────────
  const requestDeleteSingle = (id: string) => {
    setConfirmDelete({ mode: 'single', ids: [id] })
  }

  const requestDeleteSelected = () => {
    if (selectedIds.size === 0) return
    setConfirmDelete({ mode: 'bulk', ids: Array.from(selectedIds) })
  }

  const handleConfirmedDelete = async () => {
    if (!confirmDelete) return
    try {
      if (confirmDelete.mode === 'single') {
        await deleteSingle.mutateAsync(confirmDelete.ids[0])
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(confirmDelete.ids[0])
          return next
        })
      } else {
        await deleteBulk.mutateAsync(confirmDelete.ids)
        setSelectedIds(new Set())
      }
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setConfirmDelete(null)
    }
  }

  const isDeleting = deleteSingle.isPending || deleteBulk.isPending

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>{t('history.loadError', { error: error.message })}</p>
        <Button variant="outline" onClick={() => refetch()} className="mt-2">
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <>
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg">{t('history.title')}</CardTitle>

          <div className="flex items-center gap-2">
            {/* Bulk-delete toolbar — shown only when items are selected */}
            {someSelected && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 animate-in fade-in slide-in-from-top-1 duration-200">
                <span className="text-sm font-medium text-destructive">
                  {selectedIds.size} selected
                </span>
                <Button
                  id="btn-delete-selected"
                  variant="destructive"
                  size="sm"
                  onClick={requestDeleteSelected}
                  disabled={isDeleting}
                  className="h-7 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete selected
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              disabled={exportAll.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              {exportAll.isPending ? t('common.exporting') : t('history.exportAll')}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent mx-auto" />
              <p className="text-muted-foreground mt-4">{t('common.loading')}</p>
            </div>
          ) : data ? (
            <>
              <div className="overflow-x-auto rounded-md border bg-card">
                <Table className="w-full">
                  <TableHeader className="sticky top-0 z-10 bg-primary/10">
                    <TableRow>
                      {/* Select-all checkbox */}
                      <TableHead className="w-12 bg-primary/10">
                        <Checkbox
                          id="chk-select-all"
                          checked={allSelected}
                          onCheckedChange={toggleAll}
                          aria-label="Select all analyses"
                          // Indeterminate visual when some (not all) are checked
                          data-state={
                            allSelected ? 'checked' : someSelected ? 'indeterminate' : 'unchecked'
                          }
                        />
                      </TableHead>
                      <TableHead className="bg-primary/10 whitespace-nowrap font-bold">
                        {t('history.columns.date')}
                      </TableHead>
                      <TableHead className="bg-primary/10 whitespace-nowrap font-bold">
                        {t('history.columns.healthScore')}
                      </TableHead>
                      <TableHead className="bg-primary/10 whitespace-nowrap font-bold">
                        {t('history.columns.hydration')}
                      </TableHead>
                      <TableHead className="bg-primary/10 whitespace-nowrap font-bold">
                        {t('history.columns.skinType')}
                      </TableHead>
                      <TableHead className="bg-primary/10 whitespace-nowrap font-bold">
                        {t('history.columns.skinAge')}
                      </TableHead>
                      <TableHead className="bg-primary/10 whitespace-nowrap font-bold">
                        {t('history.columns.status')}
                      </TableHead>
                      <TableHead className="text-right bg-primary/10 whitespace-nowrap font-bold">
                        {t('history.columns.actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                          {t('history.noRecords')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.items.map((item) => {
                        const isSelected = selectedIds.has(item.analysisId)
                        return (
                          <TableRow
                            key={item.analysisId}
                            className={`transition-colors duration-150 ease-in-out hover:bg-muted/40 ${
                              isSelected ? 'bg-violet-50/50 dark:bg-violet-900/10' : ''
                            }`}
                          >
                            <TableCell>
                              <Checkbox
                                id={`chk-${item.analysisId}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleOne(item.analysisId)}
                                aria-label={`Select analysis from ${formatDate(item.analysisDate)}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatDate(item.analysisDate)}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {item.healthScore}
                              <span className="text-xs font-normal text-muted-foreground">/100</span>
                            </TableCell>
                            <TableCell>{item.hydration}%</TableCell>
                            <TableCell>{SKIN_TYPE_LABELS[item.skinType]}</TableCell>
                            <TableCell>{item.skinAge} yrs</TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 border border-sky-300 bg-sky-100 text-sky-700 hover:bg-sky-200 hover:text-sky-800"
                                  onClick={() =>
                                    (window.location.href = `/buyer/skin-analysis/${item.analysisId}`)
                                  }
                                  aria-label={t('history.viewDetails')}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 border border-green-300 bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 disabled:opacity-50"
                                  onClick={() => handleExportSingle(item.analysisId)}
                                  disabled={exportSingle.isPending}
                                  aria-label={t('history.exportSingle')}
                                >
                                  {exportSingle.isPending ? (
                                    <div className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent" />
                                  ) : (
                                    <Download className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  id={`btn-delete-${item.analysisId}`}
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 border border-red-300 bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 disabled:opacity-50"
                                  onClick={() => requestDeleteSingle(item.analysisId)}
                                  disabled={isDeleting}
                                  aria-label="Delete this analysis"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setParams((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  disabled={data.meta.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('common.previous')}
                </Button>
                <span className="px-3 text-sm text-muted-foreground">
                  {t('common.pageOf', {
                    page: data.meta.page,
                    total: data.meta.totalPages,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={data.meta.page >= data.meta.totalPages}
                >
                  {t('common.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Summary KPIs */}
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryMetric
                  label={t('metrics.totalAnalyses')}
                  value={data.summary.totalAnalyses}
                  icon="FileText"
                />
                <SummaryMetric
                  label={t('metrics.bestScore')}
                  value={`${data.summary.bestScore}/100`}
                  icon="Award"
                />
                <SummaryMetric
                  label={t('metrics.avgHydration')}
                  value={`${data.summary.averageHydration}%`}
                  icon="Droplets"
                />
                <SummaryMetric
                  label={t('metrics.improvement')}
                  value={`${data.summary.improvementPercentage >= 0 ? '+' : ''}${data.summary.improvementPercentage}%`}
                  icon="TrendingUp"
                  positive={data.summary.improvementPercentage >= 0}
                />
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Confirm delete dialog ──────────────────────────────────────────── */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {confirmDelete?.mode === 'single'
                ? 'Delete analysis?'
                : `Delete ${confirmDelete?.ids.length} analyses?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.mode === 'single'
                ? 'This analysis record will be permanently deleted. This action cannot be undone.'
                : `${confirmDelete?.ids.length} selected analysis records will be permanently deleted. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              id="btn-confirm-delete"
              onClick={handleConfirmedDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 rounded-full border-2 border-current border-t-transparent" />
                  Deleting…
                </span>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Helper component for summary metrics ────────────────────────────────────
const METRIC_ICONS: Record<string, LucideIcon> = {
  FileText,
  Award,
  Droplets,
  TrendingUp,
}

function SummaryMetric({
  label,
  value,
  icon,
  positive = true,
}: {
  label: string
  value: string | number
  icon: string
  positive?: boolean
}) {
  const IconComponent = METRIC_ICONS[icon] ?? FileText

  return (
    <div className="p-4 rounded-xl border border-border/50 bg-background">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <IconComponent
          className={`h-5 w-5 ${positive ? '' : 'text-red-500'}`}
          aria-hidden="true"
        />
      </div>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
