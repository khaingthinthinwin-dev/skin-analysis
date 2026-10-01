import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Maximize2, Minimize2, Download, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getImageUrl } from '@/lib/image-url'

interface MeshOverlayViewerProps {
  scanImageUrl: string
  meshOverlayUrl: string
  showMesh: boolean
  onToggleMesh: () => void
  onDownload?: (type: 'scan' | 'mesh' | 'combined') => void
  topLeft?: ReactNode
  overlayTitle?: string
  overlayDesc?: string
}

type LoadState = 'loading' | 'ready' | 'error'

export function MeshOverlayViewer({
  scanImageUrl,
  meshOverlayUrl,
  showMesh,
  onToggleMesh,
  onDownload,
  topLeft,
  overlayTitle,
  overlayDesc,
}: MeshOverlayViewerProps) {
  const { t } = useTranslation('skin')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fullscreenCanvasRef = useRef<HTMLCanvasElement>(null)
  const scanImgRef = useRef<HTMLImageElement>(null)
  const meshImgRef = useRef<HTMLImageElement>(null)

  // Storage paths are relative (`/uploads/...`) — resolve them against the API
  // origin, otherwise they 404 on the Vite dev server.
  const scanSrc = getImageUrl(scanImageUrl)
  const meshSrc = getImageUrl(meshOverlayUrl)

  const [scanState, setScanState] = useState<LoadState>(scanSrc ? 'loading' : 'error')
  const [meshState, setMeshState] = useState<LoadState>(meshSrc ? 'loading' : 'error')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const scanReady = scanState === 'ready'
  const meshReady = meshState === 'ready'
  const scanFailed = scanState === 'error'
  const meshFailed = meshState === 'error'
  const compositing = showMesh && scanReady && meshReady

  useEffect(() => {
    const draw = (canvas: HTMLCanvasElement | null) => {
      const scanImg = scanImgRef.current
      const meshImg = meshImgRef.current
      if (!canvas || !scanImg || !meshImg || !compositing) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = scanImg.naturalWidth
      canvas.height = scanImg.naturalHeight

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(scanImg, 0, 0)
      ctx.globalAlpha = 0.9
      ctx.drawImage(meshImg, 0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = 1
    }

    draw(canvasRef.current)
    if (isFullscreen) {
      draw(fullscreenCanvasRef.current)
    }
  }, [compositing, isFullscreen])

  const handleDownload = (type: 'scan' | 'mesh' | 'combined') => {
    const canvas = canvasRef.current
    if (!canvas) return

    let dataUrl: string

    if (type === 'combined' && compositing) {
      dataUrl = canvas.toDataURL('image/png')
    } else if (type === 'mesh' && meshImgRef.current) {
      const meshImg = meshImgRef.current
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = meshImg.naturalWidth
      tempCanvas.height = meshImg.naturalHeight
      const ctx = tempCanvas.getContext('2d')!
      ctx.drawImage(meshImg, 0, 0)
      dataUrl = tempCanvas.toDataURL('image/png')
    } else if (scanImgRef.current) {
      const scanImg = scanImgRef.current
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = scanImg.naturalWidth
      tempCanvas.height = scanImg.naturalHeight
      const ctx = tempCanvas.getContext('2d')!
      ctx.drawImage(scanImg, 0, 0)
      dataUrl = tempCanvas.toDataURL('image/png')
    } else {
      return
    }

    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `skin-analysis-${type}-${Date.now()}.png`
    link.click()
  }

  const controlsClass =
    'rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/75 hover:text-white'

  return (
    <>
      <div className="relative aspect-[4/3] max-h-[460px] w-full overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950/70 shadow-lg">
        {scanSrc && (
          <img
            ref={scanImgRef}
            src={scanSrc}
            alt={t('mesh.scanAlt')}
            className="absolute inset-0 h-full w-full object-contain"
            onLoad={() => setScanState('ready')}
            onError={() => setScanState('error')}
          />
        )}

        {meshSrc && (
          <img
            ref={meshImgRef}
            src={meshSrc}
            alt=""
            aria-hidden="true"
            className="hidden"
            onLoad={() => setMeshState('ready')}
            onError={() => setMeshState('error')}
          />
        )}

        {compositing && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full object-contain pointer-events-none"
          />
        )}

        {/* Status chips */}
        {topLeft && (
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">{topLeft}</div>
        )}

        {/* Floating controls */}
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <span className="hidden rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur sm:inline">
            {t('mesh.title')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMesh}
            className={`${controlsClass} h-8 px-3 text-xs`}
          >
            {showMesh ? (
              <>
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                {t('mesh.hideMesh')}
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                {t('mesh.showMesh')}
              </>
            )}
          </Button>
          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload('combined')}
              className={`${controlsClass} h-8 px-3 text-xs`}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {t('mesh.download')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(true)}
            aria-label={t('mesh.fullscreen')}
            className={`${controlsClass} h-8 w-8`}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Loading — only while the scan itself is still fetching */}
        {scanState === 'loading' && (
          <div className="absolute inset-0 grid place-items-center bg-black/45">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        )}

        {/* Scan image unavailable */}
        {scanFailed && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 p-4 text-center">
            <div className="space-y-2">
              <TriangleAlert className="mx-auto h-8 w-8 text-amber-400" />
              <p className="text-sm font-medium text-white">{t('mesh.loadError')}</p>
              <p className="text-xs text-white/60">{t('mesh.scanMissingDesc')}</p>
            </div>
          </div>
        )}

        {/* Mesh unavailable — keep the scan visible with a subtle notice */}
        {!scanFailed && showMesh && meshFailed && (
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-xs font-medium text-white backdrop-blur">
            <TriangleAlert className="h-3.5 w-3.5 text-amber-400" />
            {t('mesh.meshUnavailable')}
          </div>
        )}

        {/* Caption */}
        {(overlayTitle || overlayDesc) && !scanFailed && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 pt-12">
            {overlayTitle && (
              <p className="text-base font-semibold text-white sm:text-lg">{overlayTitle}</p>
            )}
            {overlayDesc && <p className="mt-0.5 text-xs text-white/80">{overlayDesc}</p>}
          </div>
        )}
      </div>

      {/* Fullscreen */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setIsFullscreen(false)}
          role="dialog"
          aria-label={t('mesh.title')}
        >
          <div className="relative max-h-[90vh] w-full max-w-4xl flex items-center justify-center">
            <button
              className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              onClick={() => setIsFullscreen(false)}
              aria-label={t('common.close')}
            >
              <Minimize2 className="h-5 w-5" />
            </button>
            <div className="relative inline-block max-h-[90vh]">
              <img src={scanSrc} alt={t('mesh.scanAlt')} className="max-h-[90vh] w-auto object-contain" />
              {compositing && (
                <canvas ref={fullscreenCanvasRef} className="absolute inset-0 h-full w-full object-contain pointer-events-none" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
