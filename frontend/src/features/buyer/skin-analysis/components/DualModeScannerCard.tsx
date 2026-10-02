import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Camera,
  Upload,
  Shield,
  ScanFace,
  Sun,
  Sparkles,
  RotateCw,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  FlipHorizontal,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getApiErrorMessage } from '../utils/api-error'

interface DualModeScannerCardProps {
  onAnalyze: (file: File, consent: boolean) => Promise<unknown>
  isUploading?: boolean
  isAnalyzing?: boolean
  onOpenModalCamera?: () => void
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export function DualModeScannerCard({
  onAnalyze,
  isUploading = false,
  isAnalyzing = false,
  onOpenModalCamera,
}: DualModeScannerCardProps) {
  const { t } = useTranslation('skin')

  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera')
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [stagedPreview, setStagedPreview] = useState<string | null>(null)
  const [consent, setConsent] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Camera stream state
  const [isStreaming, setIsStreaming] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [cameraError, setCameraError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const busy = isUploading || isAnalyzing

  // Stop camera stream helper
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsStreaming(false)
  }, [])

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream()
    }
  }, [stopCameraStream])

  // Start live stream.
  // IMPORTANT: we set isStreaming(true) BEFORE attaching srcObject because the
  // <video> element is only rendered when isStreaming===true. If we tried to assign
  // srcObject here, videoRef.current would still be null and the feed would be black.
  // The actual attachment happens in the useEffect below that watches isStreaming.
  const startCamera = useCallback(async () => {
    setCameraError(null)
    setError(null)
    stopCameraStream()

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      // Store stream first, then flip the flag. React will render <video> into
      // the DOM and the effect below will attach srcObject on the next tick.
      streamRef.current = stream
      setIsStreaming(true)
    } catch (err) {
      console.warn('Unable to start inline camera stream:', err)
      setCameraError('Unable to open camera. Please check camera permissions or upload a photo.')
      setIsStreaming(false)
    }
  }, [facingMode, stopCameraStream])

  // Attach the stream to <video> after React renders it into the DOM.
  useEffect(() => {
    if (isStreaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch((err) => {
        console.warn('Video play() failed:', err)
      })
    }
  }, [isStreaming])

  // Capture frame from active stream
  const handleSnapPhoto = useCallback(() => {
    if (!videoRef.current) return
    const video = videoRef.current

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `selfie-scan-${Date.now()}.jpg`, { type: 'image/jpeg' })
        setStagedFile(file)
        setStagedPreview(URL.createObjectURL(file))
        stopCameraStream()
      },
      'image/jpeg',
      0.95,
    )
  }, [stopCameraStream])

  // Toggle front/back camera
  const handleToggleFacingMode = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }, [])

  // Re-start camera only when the user flips facing mode while already streaming.
  // NOTE: isStreaming must NOT be in the dep array — startCamera sets it to true,
  // which would re-trigger this effect and instantly restart (then stop) the stream.
  const isStreamingRef = useRef(false)
  useEffect(() => {
    isStreamingRef.current = isStreaming
  }, [isStreaming])

  useEffect(() => {
    if (isStreamingRef.current) {
      startCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode])

  // Handle uploaded file
  const handleProcessFile = useCallback(
    (file: File) => {
      setError(null)
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(t('upload.error.invalidFormat', { types: 'JPG, PNG, WebP' }))
        return
      }
      if (file.size > MAX_SIZE) {
        setError(t('upload.error.fileTooLarge', { maxSize: '10MB' }))
        return
      }

      setStagedFile(file)
      setStagedPreview(URL.createObjectURL(file))
      stopCameraStream()
    },
    [t, stopCameraStream],
  )

  // Reset all staged capture
  const handleReset = useCallback(() => {
    stopCameraStream()
    setStagedFile(null)
    setStagedPreview(null)
    setError(null)
    setCameraError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [stopCameraStream])

  // Trigger analysis submission
  const handleSubmitAnalysis = useCallback(async () => {
    if (!stagedFile) {
      setError(t('upload.error.noFile'))
      return
    }
    if (!consent) {
      setError(t('upload.error.consentRequired'))
      return
    }
    try {
      await onAnalyze(stagedFile, consent)
    } catch (err) {
      setError(getApiErrorMessage(err, t('upload.error.generic')))
    }
  }, [stagedFile, consent, onAnalyze, t])

  return (
    <Card className="overflow-hidden rounded-3xl border border-border/70 bg-card/95 shadow-xl transition-all duration-300">
      {/* Top Dual Tab Switcher */}
      <div className="border-b border-border/50 bg-muted/30 p-2 sm:p-3">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera')
              setError(null)
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'camera'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ScanFace className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>Live scan</span>
            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-600 dark:text-purple-300">
              {t('camera.title')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('upload')
              stopCameraStream()
              setError(null)
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            <span>Upload photos</span>
            <span className="rounded-full bg-pink-500/10 px-2 py-0.5 text-[11px] font-medium text-pink-600 dark:text-pink-300">
              {t('upload.title')}
            </span>
          </button>
        </div>
      </div>

      <CardContent className="p-5 sm:p-8">
        {/* Two-Column Split Layout */}
        <div className="grid items-stretch gap-8 lg:grid-cols-12">
          {/* Left Column: What We Check & Value Highlights */}
          <div className="flex flex-col justify-between space-y-6 lg:col-span-5">
            <div className="space-y-4">
              <Badge
                variant="secondary"
                className="gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-[11px] font-bold text-purple-600 dark:text-purple-300 border border-purple-500/20"
              >
                <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                WHAT WE CHECK
              </Badge>

              <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                10 skin metrics in{' '}
                <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                  one selfie
                </span>
                .
              </h2>

              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Our on-device model scores acne, dark circles, pigmentation, oiliness, redness,
                hydration, pores, fine lines, dark spots and overall tone — then matches your
                routine.
              </p>
            </div>

            {/* 3 Guideline Feature Cards */}
            <div className="space-y-3">
              <div className="flex items-center gap-3.5 rounded-2xl border border-border/50 bg-background/80 p-3.5 shadow-xs transition-colors hover:border-purple-300 dark:hover:border-purple-800">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Stays on your device</h3>
                  <p className="text-xs text-muted-foreground">Frames never leave your browser.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-border/50 bg-background/80 p-3.5 shadow-xs transition-colors hover:border-pink-300 dark:hover:border-pink-800">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400">
                  <ScanFace className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Live face tracking</h3>
                  <p className="text-xs text-muted-foreground">We auto-capture the sharpest moment.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-border/50 bg-background/80 p-3.5 shadow-xs transition-colors hover:border-purple-300 dark:hover:border-purple-800">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Sun className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Best with daylight</h3>
                  <p className="text-xs text-muted-foreground">Face a window — no harsh overhead light.</p>
                </div>
              </div>
            </div>

            {/* Meta Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                Average scan: 30 s
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Zap className="h-3 w-3 text-pink-500" />
                Free, no signup
              </span>
            </div>
          </div>

          {/* Right Column: Viewfinder or Upload Dropzone */}
          <div className="flex flex-col justify-center lg:col-span-7">
            {/* Viewfinder Container */}
            {activeTab === 'camera' && (
              <div className="relative flex aspect-[4/3] w-full flex-col justify-between overflow-hidden rounded-3xl border border-purple-900/40 bg-gradient-to-br from-slate-950 via-[#120a22] to-slate-900 p-6 text-white shadow-2xl">
                {/* State 1: Staged Photo Captured */}
                {stagedPreview ? (
                  <div className="relative flex h-full w-full flex-col items-center justify-between">
                    <div className="relative h-full w-full overflow-hidden rounded-2xl">
                      <img
                        src={stagedPreview}
                        alt="Captured Face Preview"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                      <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-purple-300 backdrop-blur-md">
                        <CheckCircle2 className="h-3.5 w-3.5 text-pink-400" />
                        Selfie captured & sharp
                      </div>
                    </div>

                    <div className="absolute bottom-4 flex items-center gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setStagedFile(null)
                          setStagedPreview(null)
                          startCamera()
                        }}
                        className="rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
                      >
                        <RotateCw className="mr-1.5 h-3.5 w-3.5" />
                        {t('camera.retake')}
                      </Button>
                    </div>
                  </div>
                ) : isStreaming ? (
                  /* State 2: Active Camera Streaming */
                  <div className="relative flex h-full w-full flex-col justify-between">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 h-full w-full rounded-2xl object-cover"
                    />

                    {/* Face Guide Oval with Scanner Overlay */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="relative aspect-[3/4] h-[75%] rounded-[50%] border-2 border-purple-400/60 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                        {/* 4 Corner Targeting Brackets */}
                        <span className="absolute -top-1 -left-1 h-5 w-5 rounded-tl-lg border-t-2 border-l-2 border-purple-400" />
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-tr-lg border-t-2 border-r-2 border-purple-400" />
                        <span className="absolute -bottom-1 -left-1 h-5 w-5 rounded-bl-lg border-b-2 border-l-2 border-purple-400" />
                        <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-br-lg border-b-2 border-r-2 border-purple-400" />

                        {/* Animated Laser Scanning Line */}
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_12px_rgba(236,72,153,0.9)] animate-pulse" />
                      </div>
                    </div>

                    {/* Top Streaming Bar */}
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-purple-300 backdrop-blur-md">
                        <span className="h-2 w-2 rounded-full bg-pink-500 animate-ping" />
                        Live tracking active
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleToggleFacingMode}
                          className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
                          title={t('camera.switch')}
                        >
                          <FlipHorizontal className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={stopCameraStream}
                          className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
                          title="Close camera"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Bottom Shutter Controls */}
                    <div className="relative z-10 flex items-center justify-center pb-2">
                      <button
                        type="button"
                        onClick={handleSnapPhoto}
                        className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg ring-4 ring-purple-400/40 transition-transform active:scale-95"
                        aria-label="Capture frame"
                      >
                        <Camera className="h-7 w-7 text-purple-600 transition-transform group-hover:scale-110" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* State 3: Idle Viewfinder (Ready when you are) */
                  <div className="relative flex h-full w-full flex-col items-center justify-center text-center">
                    {/* Concentric Radar Rings in Website Brand Colors */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                      <div className="h-80 w-80 rounded-full border border-purple-900/40" />
                      <div className="absolute h-60 w-60 rounded-full border border-purple-800/30" />
                      <div className="absolute h-40 w-40 rounded-full border border-pink-700/30 animate-pulse" />
                    </div>

                    <div className="relative z-10 flex flex-col items-center space-y-4 max-w-sm">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 p-3 shadow-lg shadow-purple-600/30">
                        <ScanFace className="h-9 w-9 text-white" />
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                          Ready when you are
                        </h3>
                        <p className="text-xs text-purple-200/80 font-medium">
                          {t('camera.ready')}
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Frames stay on your device. Nothing is uploaded until you press Analyze.
                        </p>
                      </div>

                      {cameraError ? (
                        <div className="flex flex-col items-center gap-3">
                          <p className="text-xs text-rose-400 text-center max-w-xs">{cameraError}</p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={startCamera}
                              disabled={busy}
                              variant="outline"
                              className="rounded-full border-purple-500/40 text-purple-300 hover:bg-purple-950/40 text-xs"
                            >
                              <RotateCw className="mr-1.5 h-3 w-3" />
                              Try again
                            </Button>
                            {onOpenModalCamera && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={onOpenModalCamera}
                                disabled={busy}
                                className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-5 font-bold text-white text-xs shadow-md hover:opacity-95"
                              >
                                <Camera className="mr-1.5 h-3 w-3" />
                                Use camera dialog
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="lg"
                          onClick={startCamera}
                          disabled={busy}
                          className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-7 font-bold text-white shadow-md shadow-purple-500/20 hover:opacity-95 transition-all active:scale-95"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          {t('camera.takePhoto')}
                        </Button>
                      )}

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-purple-400" /> On-device
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <ScanFace className="h-3 w-3 text-pink-400" /> AI tracking
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-purple-300" /> 10 concerns
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload Photos Zone */}
            {activeTab === 'upload' && (
              <div
                ref={dropZoneRef}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer.files[0]) {
                    handleProcessFile(e.dataTransfer.files[0])
                  }
                }}
                className="relative flex aspect-[4/3] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/80 bg-muted/20 p-6 text-center transition-colors hover:border-purple-500/50 hover:bg-muted/30"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleProcessFile(e.target.files[0])
                    }
                  }}
                />

                {stagedPreview ? (
                  <div className="relative h-full w-full overflow-hidden rounded-2xl">
                    <img
                      src={stagedPreview}
                      alt="Uploaded Preview"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                    <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-purple-300 backdrop-blur-md">
                      <CheckCircle2 className="h-3.5 w-3.5 text-pink-400" />
                      Image loaded & validated
                    </div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Choose another file
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-300">
                      <Upload className="h-7 w-7" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-base font-bold text-foreground">
                        {t('upload.dragDrop')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports JPG, PNG, WebP (Max 10MB)
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full font-semibold border-purple-500/40 text-purple-600 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Browse Files
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <Alert variant="destructive" className="mt-6 rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {/* Consent Checkbox */}
        <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-border/50 bg-muted/20 p-3.5">
          <Checkbox
            id="dual-scanner-consent"
            checked={consent}
            onCheckedChange={(c) => setConsent(Boolean(c))}
            disabled={busy}
          />
          <Label
            htmlFor="dual-scanner-consent"
            className="text-xs leading-relaxed text-muted-foreground cursor-pointer"
          >
            {t('upload.consent')}
          </Label>
        </div>

        {/* Trust Badges in Website Colors */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 font-semibold text-purple-600 dark:text-purple-300">
            <Shield className="h-3.5 w-3.5" />
            Private — on-device
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-3.5 py-1 font-semibold text-pink-600 dark:text-pink-300">
            <ScanFace className="h-3.5 w-3.5" />
            Live AI overlay
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 font-semibold text-purple-600 dark:text-purple-300">
            <Sparkles className="h-3.5 w-3.5" />
            10 concerns analysed
          </span>
        </div>

        {/* Footer Action Bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-5 sm:flex-row">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground">
              1
            </span>
            {stagedFile ? (
              <span className="text-purple-600 dark:text-purple-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-pink-500" />
                1/1 captured
              </span>
            ) : (
              <span>0/1 captured</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={busy || (!stagedFile && !isStreaming)}
              className="rounded-full text-xs font-semibold"
            >
              <RotateCw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>

            <Button
              type="button"
              size="lg"
              onClick={handleSubmitAnalysis}
              disabled={!stagedFile || !consent || busy}
              className="rounded-full bg-gradient-to-r from-purple-600 via-purple-700 to-pink-500 px-7 font-bold text-white shadow-lg shadow-purple-600/25 transition-all hover:opacity-95 disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze my skin
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
