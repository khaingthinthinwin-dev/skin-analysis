import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { useExport } from '@/features/admin/advertisement-management/hooks/useExport'
import { ExportConfigForm } from '@/features/admin/advertisement-management/components/ExportConfigForm'
import { ReportTypeSelector } from '@/features/admin/advertisement-management/components/ReportTypeSelector'
import type { AdminExportInput, ReportType } from '@/types/admin-ad-management'
import type { ApprovalStatus, Placement, Tier } from '@/types/admin-ad-management'

type ExportBase = Omit<AdminExportInput, 'reportType'>

export default function ExportReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('ad_performance')
  const {
    exportAdPerformanceMutation,
    exportSubmissionHistoryMutation,
    exportFeeHistoryMutation,
  } = useExport()

  const isGenerating =
    exportAdPerformanceMutation.isPending ||
    exportSubmissionHistoryMutation.isPending ||
    exportFeeHistoryMutation.isPending

  const handleGenerate = (base: ExportBase) => {
    const onError = () => toast({ title: 'Failed to generate report', variant: 'destructive' })
    if (reportType === 'ad_performance') {
      exportAdPerformanceMutation.mutate(
        {
          dateFrom: base.dateFrom,
          dateTo: base.dateTo,
          format: 'csv',
          placement: base.placement as Placement[] | undefined,
          tier: base.tier as Tier[] | undefined,
          status: base.status as ApprovalStatus[] | undefined,
        },
        { onSuccess: () => toast({ title: 'Report generated and download started', variant: 'default' }), onError },
      )
    } else if (reportType === 'submission_history') {
      exportSubmissionHistoryMutation.mutate(
        { dateFrom: base.dateFrom, dateTo: base.dateTo, format: 'csv', shop: base.shop },
        { onSuccess: () => toast({ title: 'Report generated and download started', variant: 'default' }), onError },
      )
    } else {
      exportFeeHistoryMutation.mutate(
        {
          dateFrom: base.dateFrom,
          dateTo: base.dateTo,
          format: 'csv',
          placement: base.placement as Placement[] | undefined,
          tier: base.tier as Tier[] | undefined,
        },
        { onSuccess: () => toast({ title: 'Report generated and download started', variant: 'default' }), onError },
      )
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Export Reports</h1>
          <p className="text-muted-foreground">Generate CSV reports for advertisements and fee history</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/ads">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Ads
          </Link>
        </Button>
      </div>

      <ReportTypeSelector value={reportType} onChange={setReportType} />

      <ExportConfigForm isGenerating={isGenerating} onGenerate={handleGenerate} />
    </div>
  )
}