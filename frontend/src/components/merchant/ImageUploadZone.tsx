import { useCallback, useRef, useState } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ImageUploadZoneProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  maxFiles?: number
  disabled?: boolean
  className?: string
}

export function ImageUploadZone({
  files,
  onFilesChange,
  maxFiles = 10,
  disabled = false,
  className,
}: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return
      const imageFiles = Array.from(newFiles).filter((f) =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(f.type),
      )
      const remaining = maxFiles - files.length
      const toAdd = imageFiles.slice(0, remaining)
      onFilesChange([...files, ...toAdd])
    },
    [files, maxFiles, onFilesChange],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (!disabled) handleFiles(e.dataTransfer.files)
    },
    [disabled, handleFiles],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index))
    },
    [files, onFilesChange],
  )

  const remaining = maxFiles - files.length

  return (
    <div className={cn('space-y-3', className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled || remaining <= 0}
        />
        <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag & drop images here, or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPG, PNG, WebP · Max 5MB each · {remaining} of {maxFiles} remaining
        </p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {files.map((file, index) => (
            <FilePreview key={`${file.name}-${index}`} file={file} onRemove={() => removeFile(index)} />
          ))}
        </div>
      )}

      {files.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || remaining <= 0}
        >
          <Upload className="mr-1 h-3 w-3" />
          Add more
        </Button>
      )}
    </div>
  )
}

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const previewUrl = URL.createObjectURL(file)

  return (
    <div className="relative group aspect-square rounded-lg border overflow-hidden bg-muted">
      <img
        src={previewUrl}
        alt={file.name}
        className="h-full w-full object-cover"
        onLoad={() => URL.revokeObjectURL(previewUrl)}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="absolute top-1 right-1 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
      <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5">
        <p className="text-[10px] text-white truncate">{file.name}</p>
      </div>
    </div>
  )
}
