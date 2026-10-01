import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  History,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useSkinAnalysis,
  useLatestAnalysis,
  useAnalysisDetail,
  usePollAnalysis,
} from '../../features/buyer/skin-analysis/hooks/useSkinAnalysis'
import { DualModeScannerCard } from '../../features/buyer/skin-analysis/components/DualModeScannerCard'
import { CameraCaptureModal } from '../../features/buyer/skin-analysis/components/CameraCaptureModal'
import { ProcessingProgressCard } from '../../features/buyer/skin-analysis/components/ProcessingProgressCard'
import { ExportReportButton } from '../../features/buyer/skin-analysis/components/ExportReportButton'
import { AIFacialAnalysisCard } from './AIFacialAnalysisCard'

type ViewMode = 'scanner' | 'processing' | 'results'

export default function SkinAnalysisPage() {
  const { t } = useTranslation('skin')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id: routeAnalysisId } = useParams<{ id: string }>()

  const [requestedView, setViewMode] = useState<ViewMode>('scanner')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null)

  const viewMode: ViewMode = routeAnalysisId ? 'results' : requestedView

  const { uploadImage, startAnalysis, isUploading, isAnalyzing, reset } =
    useSkinAnalysis()
  const latestQuery = useLatestAnalysis()
  const activeAnalysisId =
    routeAnalysisId ?? currentAnalysisId ?? latestQuery.data?.analysisId ?? null
  const analysisDetail = useAnalysisDetail(activeAnalysisId)

  const pollAnalysis = usePollAnalysis(viewMode === 'processing' ? currentAnalysisId : null, {
    onComplete: (data) => {
      queryClient.setQueryData(['skin-analysis', 'detail', data.analysisId], data)
      queryClient.invalidateQueries({ queryKey: ['skin-analysis', 'latest'] })
      setCurrentAnalysisId(data.analysisId)
      setViewMode('results')
    },
  })

  const handleUpload = useCallback(
    async (file: File, consent: boolean) => {
      const result = await uploadImage({ file, consent })
      const analysisResult = await startAnalysis(result.blobUrl)
      setCurrentAnalysisId(analysisResult.analysisId)
      setViewMode('processing')
      return result
    },
    [uploadImage, startAnalysis],
  )

  const handleCameraCapture = useCallback(
    async (dataUrl: string) => {
      setCameraOpen(false)
      try {
        const response = await fetch(dataUrl)
        const blob = await response.blob()
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
        await handleUpload(file, true)
      } catch (err) {
        console.error('Camera capture failed:', err)
      }
    },
    [handleUpload],
  )

  const handleCancelProcessing = useCallback(() => {
    reset()
    setCurrentAnalysisId(null)
    setViewMode('scanner')
  }, [reset])

  const handleNewScan = useCallback(() => {
    setCurrentAnalysisId(null)
    setViewMode('scanner')
    if (routeAnalysisId) navigate('/buyer/skin-analysis')
  }, [navigate, routeAnalysisId])

  const handleViewHistory = useCallback(() => {
    navigate('/buyer/skin-analysis/history')
  }, [navigate])

  const busy = isUploading || isAnalyzing

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewHistory}
          className="rounded-full border-border/80 text-xs font-semibold shadow-xs hover:bg-muted/50"
        >
          <History className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
          View History
        </Button>

        <div className="flex items-center gap-2">
          {viewMode === 'results' && (
            <Button
              size="sm"
              onClick={handleNewScan}
              className="rounded-full bg-gradient-to-r from-purple-600 via-purple-700 to-pink-500 text-white shadow-md hover:opacity-95 text-xs font-semibold"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              New Scan
            </Button>
          )}
          <ExportReportButton variant="history" className="rounded-full text-xs" />
        </div>
      </div>

      {busy && (
        <div className="flex items-center gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-700 dark:text-violet-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isUploading ? t('upload.uploading') : t('upload.analyzing')}
        </div>
      )}

      {/* Main Single Page Content */}
      {viewMode === 'scanner' && (
        <div className="space-y-6">
          {/* Direct Dual Mode Scanner Card */}
          <DualModeScannerCard
            onAnalyze={handleUpload}
            isUploading={isUploading}
            isAnalyzing={isAnalyzing}
            onOpenModalCamera={() => setCameraOpen(true)}
          />
        </div>
      )}

      {/* Processing State */}
      {viewMode === 'processing' && (
        <ProcessingProgressCard
          status={pollAnalysis.data?.status ?? 'PROCESSING'}
          estimatedWaitSeconds={15}
          onCancel={handleCancelProcessing}
        />
      )}

      {/* Results State */}
      {viewMode === 'results' && (
        <div className="space-y-4">
          {analysisDetail.data ? (
            <AIFacialAnalysisCard
              key={analysisDetail.data.analysisId}
              analysis={analysisDetail.data}
            />
          ) : analysisDetail.isError ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 py-12 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {t('history.loadError')}
              </p>
              <Button variant="outline" size="sm" onClick={() => analysisDetail.refetch()}>
                {t('common.retry')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card py-12 text-sm font-semibold text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading')}
            </div>
          )}
        </div>
      )}

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  )
}
