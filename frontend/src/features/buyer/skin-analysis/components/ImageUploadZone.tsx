import { useCallback, useRef, useState } from 'react'
import { Upload, X, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getApiErrorMessage } from '../utils/api-error'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

interface ImageUploadZoneProps {
  onUpload: (file: File, consent: boolean) => Promise<unknown>
  onError?: (error: { message: string; errorCode?: string }) => void
  isUploading?: boolean
  isAnalyzing?: boolean
}

export function ImageUploadZone({
  onUpload,
  onError,
  isUploading,
  isAnalyzing,
}: ImageUploadZoneProps) {
  const { t } = useTranslation('skin')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<{ message: string; errorCode?: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return t('upload.error.invalidFormat', { types: 'JPG, PNG, WebP' })
    }
    if (f.size > MAX_SIZE) {
      return t('upload.error.fileTooLarge', { maxSize: '10MB' })
    }
    return null
  }, [t])

  const handleFileChange = useCallback(
    (f: File | null) => {
      if (!f) {
        setFile(null)
        setPreview(null)
        return
      }

      const validationError = validateFile(f)
      if (validationError) {
        setError({ message: validationError, errorCode: '40001' })
        onError?.({ message: validationError, errorCode: '40001' })
        setFile(null)
        setPreview(null)
        return
      }

      setError(null)
      setFile(f)
      setPreview(URL.createObjectURL(f))
    },
    [validateFile, onError],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isUploading && !isAnalyzing) setDragActive(true)
  }, [isUploading, isAnalyzing])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (isUploading || isAnalyzing) return

      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) handleFileChange(droppedFile)
    },
    [isUploading, isAnalyzing, handleFileChange],
  )

  const handleUploadClick = useCallback(async () => {
    if (!file || !consent) {
      setError({
        message: consent ? t('upload.error.noFile') : t('upload.error.consentRequired'),
        errorCode: consent ? '40001' : '40003',
      })
      return
    }

    setError(null)
    try {
      await onUpload(file, consent)
      setFile(null)
      setPreview(null)
      setConsent(false)
    } catch (err) {
      const message = getApiErrorMessage(err, t('upload.error.generic'))
      const errorCode = (err as { response?: { data?: { errorCode?: string } } })?.response?.data
        ?.errorCode
      setError({ message, errorCode })
      onError?.({ message, errorCode })
    }
  }, [file, consent, onUpload, onError, t])

  const clearFile = useCallback(() => {
    setFile(null)
    setPreview(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  return (
    <Card
      className={`border-border/80 shadow-xs ${
        dragActive ? 'border-violet-500/60 bg-violet-50/40 dark:bg-violet-950/20' : ''
      }`}
    >
      <CardContent className="space-y-4">
        {/* Drop Zone / Preview */}
        <div className="relative">
          {preview ? (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
              <img
                src={preview}
                alt={t('upload.previewAlt')}
                className="w-full h-full object-cover"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 rounded-full bg-background/80"
                onClick={clearFile}
                disabled={isUploading || isAnalyzing}
                aria-label={t('upload.removeFile')}
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-3 transition-colors ${
                dragActive
                  ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/30'
                  : 'border-border/60 bg-muted/30'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="p-3.5 rounded-full bg-violet-50 text-violet-600 ring-1 ring-violet-100 dark:bg-violet-950/60 dark:text-violet-400 dark:ring-violet-900">
                <Upload className="h-10 w-10" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {t('upload.dragDrop')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('upload.supportedFormats', { formats: 'JPG, PNG, WebP (Max 10MB)' })}
                </p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert className="mt-3" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error.message}</AlertDescription>
            </Alert>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUploadClick}
            disabled={!file || !consent || isUploading || isAnalyzing}
            size="lg"
            className="w-full rounded-full bg-violet-600 text-white font-semibold hover:bg-violet-700 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Upload className="mr-2 h-5 w-5 animate-spin" />
                {t('upload.uploading')}
              </>
            ) : isAnalyzing ? (
              <>
                <Upload className="mr-2 h-5 w-5 animate-pulse" />
                {t('upload.analyzing')}
              </>
            ) : file ? (
              <>
                <Upload className="mr-2 h-5 w-5" />
                {t('upload.uploadFile')}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                {t('upload.selectFile')}
              </>
            )}
          </Button>

          {/* Consent Checkbox */}
          <div className="flex items-start gap-2">
            <Checkbox
              id="skin-analysis-consent"
              checked={consent}
              onCheckedChange={setConsent}
              disabled={isUploading || isAnalyzing}
              aria-describedby="consent-description"
            />
            <Label
              htmlFor="skin-analysis-consent"
              className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
            >
              {t('upload.consent')}
            </Label>
          </div>
        </div>

        {/* Guidelines Link */}
        <details className="group">
          <summary className="cursor-pointer text-sm text-violet-600 hover:text-violet-500 flex items-center gap-1">
            <span className="transition-transform group-open:rotate-90">▸</span>
            {t('upload.guidelinesTitle')}
          </summary>
          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            <p>{t('upload.guidelines.1')}</p>
            <p>{t('upload.guidelines.2')}</p>
            <p>{t('upload.guidelines.3')}</p>
            <p>{t('upload.guidelines.4')}</p>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}