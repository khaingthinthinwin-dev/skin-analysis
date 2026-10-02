import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import {
  Download,
  Eye,
  TrendingUp,
  Trash2,
  CalendarRange,
  SlidersHorizontal,
  FileText,
  Award,
  Droplets,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { PaginationControls } from '@/components/PaginationControls'
import { useAnalysisHistory } from '../../features/buyer/skin-analysis/hooks/useAnalysisHistory'
import { useExportHistoryReport } from '../../features/buyer/skin-analysis/hooks/useExportReport'
import {
  useDeleteAnalysis,
  useDeleteAnalyses,
} from '../../features/buyer/skin-analysis/hooks/useDeleteAnalysis'
import { ExportReportButton } from '../../features/buyer/skin-analysis/components/ExportReportButton'
import { AnalysisComparisonModal } from '../../features/buyer/skin-analysis/components/AnalysisComparisonModal'
import { SKIN_TYPE_LABELS } from '../../features/buyer/skin-analysis/types/skin-analysis.types'
import type { HistoryQueryParams } from '@/schemas/skin-analysis.schema'

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  PROCESSING: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
  FAILED: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700',
}

export default function SkinAnalysisHistoryPage() {
  const { t } = useTranslation('skin')
  const navigate = useNavigate()

  // ── Filter / Pagination state ─────────────────────────────────────────────
  const [params, setParams] = useState<HistoryQueryParams>({
    page: 1,
    pageSize: 10,
    dateFrom: undefined,
    dateTo: undefined,
  })
  const [showFilters, setShowFilters] = useState(false)

  // ── Selection state ───────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<{ mode: 'single' | 'bulk'; ids: string[] } | null>(null)
  const [compareIds, setCompareIds] = useState<{ id1: string; id2: string } | null>(null)

  // ── Data & mutations ──────────────────────────────────────────────────────
  const exportAll = useExportHistoryReport()
  const deleteSingle = useDeleteAnalysis()
  const deleteBulk = useDeleteAnalyses()
  const { data, isLoading, error, refetch } = useAnalysisHistory(params)

  const isDeleting = deleteSingle.isPending || deleteBulk.isPending

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  // ── Selection ─────────────────────────────────────────────────────────────
  const allIds = useMemo(
    () => data?.items.map((i) => i.analysisId) ?? [],
    [data?.items],
  )
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id))
  const someSelected = allIds.some((id) => selectedIds.has(id))

  const toggleAll = useCallback(() => {
    setSelectedIds(allSelected ? new Set() : new Set(allIds))
  }, [allSelected, allIds])

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleConfirmedDelete = async () => {
    if (!confirmDelete) return
    try {
      if (confirmDelete.mode === 'single') {
        await deleteSingle.mutateAsync(confirmDelete.ids[0])
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(confirmDelete.ids[0]); return n })
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

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">{t('history.loadError', { error: error.message })}</p>
          <p className="text-sm text-muted-foreground mt-1">Please check your connection and try again.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-2 lg:p-4">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {t('history.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('history.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {(params.dateFrom || params.dateTo) && (
              <span className="h-2 w-2 rounded-full bg-violet-500 inline-block" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAll.mutate()}
            disabled={exportAll.isPending}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {exportAll.isPending ? t('common.exporting') : t('history.exportAll')}
          </Button>
        </div>
      </div>

      {/* ── Collapsible Filters ───────────────────────────────────────────── */}
      {showFilters && (
        <Card className="rounded-2xl border-border/60 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <CardContent className="pt-5">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="dateFrom" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {t('history.dateFrom')}
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={params.dateFrom ?? ''}
                  onChange={(e) => setParams((p) => ({ ...p, dateFrom: e.target.value || undefined, page: 1 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateTo" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {t('history.dateTo')}
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={params.dateTo ?? ''}
                  onChange={(e) => setParams((p) => ({ ...p, dateTo: e.target.value || undefined, page: 1 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pageSize" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('history.pageSize')}
                </Label>
                <Select
                  value={String(params.pageSize)}
                  onValueChange={(v) => setParams((p) => ({ ...p, pageSize: Number(v), page: 1 }))}
                >
                  <SelectTrigger id="pageSize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {t('common.pageSize', { size: n })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setParams({ page: 1, pageSize: 10 }); setShowFilters(false) }}
                >
                  <X className="h-3.5 w-3.5" />
                  {t('common.clearFilters')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('metrics.totalAnalyses'), value: data.summary.totalAnalyses, icon: FileText, color: 'text-violet-500' },
            { label: t('metrics.bestScore'), value: `${data.summary.bestScore}/100`, icon: Award, color: 'text-amber-500' },
            { label: t('metrics.avgHydration'), value: `${data.summary.averageHydration}%`, icon: Droplets, color: 'text-sky-500' },
            {
              label: t('metrics.improvement'),
              value: `${data.summary.improvementPercentage >= 0 ? '+' : ''}${data.summary.improvementPercentage}%`,
              icon: TrendingUp,
              color: data.summary.improvementPercentage >= 0 ? 'text-emerald-500' : 'text-red-500',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-xl border border-border/50 bg-card px-4 py-3 flex items-center gap-3 shadow-sm"
            >
              <span className={`p-2 rounded-lg bg-muted ${color}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xl font-extrabold leading-tight">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Bulk-action bar — visible only when rows are selected ─────────── */}
      {someSelected && (
        <div className="flex items-center justify-between px-5 py-3 mb-4 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
            {selectedIds.size} {selectedIds.size === 1 ? 'record' : 'records'} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-8"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
            <Button
              id="btn-delete-selected"
              variant="destructive"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setConfirmDelete({ mode: 'bulk', ids: Array.from(selectedIds) })}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {selectedIds.size === allIds.length ? 'all' : 'selected'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Main table ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : data ? (
        <>
          <div className="overflow-x-auto rounded-md border bg-card">
            <Table className="w-full">
              <TableHeader className="sticky top-0 z-10 bg-primary/10">
                <TableRow>
                  <TableHead className="w-12 bg-primary/10">
                    <Checkbox
                      id="chk-select-all"
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                      data-state={allSelected ? 'checked' : someSelected ? 'indeterminate' : 'unchecked'}
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
                          isSelected ? 'bg-violet-50/60 dark:bg-violet-900/10' : ''
                        }`}
                      >
                        <TableCell>
                          <Checkbox
                            id={`chk-${item.analysisId}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleOne(item.analysisId)}
                            aria-label={`Select ${formatDate(item.analysisDate)}`}
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
                        <TableCell>
                          {SKIN_TYPE_LABELS[item.skinType as keyof typeof SKIN_TYPE_LABELS]}
                        </TableCell>
                        <TableCell>{item.skinAge} yrs</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium ${STATUS_STYLES[item.status] ?? ''}`}
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                            {/* View */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 border border-sky-300 bg-sky-100 text-sky-700 hover:bg-sky-200 hover:text-sky-800"
                              onClick={() => navigate(`/buyer/skin-analysis/${item.analysisId}`)}
                              aria-label={t('history.viewDetails')}
                              title={t('history.viewDetails')}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {/* Export single */}
                            <ExportReportButton
                              analysisId={item.analysisId}
                              variant="single"
                              iconOnly
                              className="h-7 w-7 border border-green-300 bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 disabled:opacity-50"
                            />
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
          <PaginationControls
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            onPageChange={(page) => setParams((p) => ({ ...p, page }))}
            limit={data.meta.pageSize}
            onLimitChange={(pageSize) => setParams((p) => ({ ...p, pageSize, page: 1 }))}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        </>
      ) : null}

      {/* ── Confirm delete dialog ─────────────────────────────────────────── */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="p-1.5 rounded-full bg-destructive/10 text-destructive">
                <Trash2 className="h-4 w-4" />
              </span>
              {confirmDelete?.mode === 'single' ? 'Delete analysis?' : `Delete ${confirmDelete?.ids.length} analyses?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.mode === 'single'
                ? 'This analysis record will be permanently deleted and cannot be recovered.'
                : `${confirmDelete?.ids.length} selected analysis records will be permanently deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              id="btn-confirm-delete"
              onClick={handleConfirmedDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {isDeleting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Comparison modal ──────────────────────────────────────────────── */}
      <AnalysisComparisonModal
        open={!!compareIds}
        onClose={() => setCompareIds(null)}
        analysisId1={compareIds?.id1 ?? ''}
        analysisId2={compareIds?.id2 ?? ''}
      />
    </div>
  )
}
