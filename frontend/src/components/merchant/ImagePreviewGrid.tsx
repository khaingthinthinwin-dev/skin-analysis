import { useState } from 'react'
import { X, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function getImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
  const base = raw.replace(/\/api\/v1\/?$/, '')
  return base + url
}

interface ImagePreviewGridProps {
  images: string[]
  retainedUrls: string[]
  onRetainedUrlsChange: (urls: string[]) => void
  className?: string
}

function PreviewImage({ url }: { url: string }) {
  const [error, setError] = useState(false)

  if (!url || error) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-muted">
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }

  return (
    <img
      src={getImageUrl(url)}
      alt="Product"
      className="h-full w-full object-cover"
      onError={() => setError(true)}
    />
  )
}

export function ImagePreviewGrid({
  images,
  retainedUrls,
  onRetainedUrlsChange,
  className,
}: ImagePreviewGridProps) {
  const toggleRetain = (url: string) => {
    if (retainedUrls.includes(url)) {
      onRetainedUrlsChange(retainedUrls.filter((u) => u !== url))
    } else {
      onRetainedUrlsChange([...retainedUrls, url])
    }
  }

  if (images.length === 0) return null

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium text-muted-foreground">Existing images</p>
      <div className="flex flex-wrap gap-2">
        {images.map((url) => {
          const isRetained = retainedUrls.includes(url)
          return (
            <div key={url} className="relative group">
              <button
                type="button"
                onClick={() => toggleRetain(url)}
                className={cn(
                  'relative block h-20 w-20 overflow-hidden rounded-lg border-2 transition-all',
                  isRetained
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-muted-foreground/25 opacity-50',
                )}
              >
                <PreviewImage url={url} />
              </button>
              {isRetained && (
                <button
                  type="button"
                  onClick={() => toggleRetain(url)}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Click an image to toggle retention. Retained images will be kept when saving.
      </p>
    </div>
  )
}
