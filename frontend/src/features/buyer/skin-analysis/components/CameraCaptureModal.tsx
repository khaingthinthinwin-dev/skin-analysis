import { useEffect, useRef, useState } from 'react'
import { X, Camera, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface CameraCaptureModalProps {
  open: boolean
  onClose: () => void
  onCapture: (dataUrl: string) => void
}

export function CameraCaptureModal({ open, onClose, onCapture }: CameraCaptureModalProps) {
  const { t } = useTranslation('skin')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [captured, setCaptured] = useState(false)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = mediaStream
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (err) {
        console.error('Camera access denied:', err)
      }
    }

    startCamera()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [open, facingMode])

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setPhotoDataUrl(dataUrl)
    setCaptured(true)
  }

  const handleRetake = () => {
    setCaptured(false)
    setPhotoDataUrl(null)
  }

  const handleConfirm = () => {
    if (photoDataUrl) {
      onCapture(photoDataUrl)
    }
  }

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
    setCaptured(false)
    setPhotoDataUrl(null)
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>{t('camera.title')}</span>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <CardContent className="p-0">
          {captured && photoDataUrl ? (
            <div className="relative aspect-video">
              <img
                src={photoDataUrl}
                alt={t('camera.capturedAlt')}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 right-4 flex justify-between p-4">
                <Button variant="outline" onClick={handleRetake} size="lg">
                  <X className="mr-2 h-5 w-5" />
                  {t('camera.retake')}
                </Button>
                <Button onClick={handleConfirm} size="lg" className="rounded-full bg-violet-600 hover:bg-violet-700">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {t('camera.usePhoto')}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="relative aspect-video bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex items-center justify-between p-4 space-x-4">
                <Button variant="outline" onClick={handleSwitchCamera} size="lg" disabled={!stream}>
                  <Camera className="mr-2 h-5 w-5" />
                  {t('camera.switch')}
                </Button>
                <div className="flex-1" />
                <Button onClick={handleCapture} size="lg" className="h-20 w-20 rounded-full bg-violet-600 ring-4 ring-violet-200 hover:bg-violet-700 dark:ring-violet-900" disabled={!stream}>
                  <Camera className="h-10 w-10 text-white" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </DialogContent>
    </Dialog>
  )
}