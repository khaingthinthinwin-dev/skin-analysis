import { useEffect, useState } from 'react'
import { ImageIcon, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useProducts } from '@/hooks/useProducts'
import { getImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12

interface ProductImagePickerProps {
  value: string
  onChange: (imageUrl: string) => void
  /** Message shown under the grid, e.g. the form-level validation error. */
  error?: string
}

function Thumb({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    )
  }

  return (
    <img
      src={getImageUrl(url)}
      alt={alt}
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  )
}

/**
 * Advertisement images are never uploaded: the merchant picks one of the images
 * already attached to one of their own products. The backend re-validates the
 * chosen path against the merchant's catalogue before persisting it.
 */
export function ProductImagePicker({ value, onChange, error }: ProductImagePickerProps) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const { data, isPending, isError } = useProducts({
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  })

  const products = data?.items ?? []
  // Only products that actually have an image can contribute a choice.
  const options = products.flatMap((product) =>
    product.images.map((imageUrl) => ({ imageUrl, productName: product.name })),
  )
  const totalPages = data?.meta.totalPages ?? 0

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search your products"
          className="pl-9"
          aria-label="Search your products"
        />
      </div>

      {isPending ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load your product images. Please try again.
        </p>
      ) : options.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {search
            ? `No product images found for "${search}".`
            : 'You have no product images yet. Upload an image to one of your products first.'}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {options.map(({ imageUrl, productName }) => {
            const isSelected = value === imageUrl
            return (
              <button
                key={imageUrl}
                type="button"
                onClick={() => onChange(imageUrl)}
                aria-pressed={isSelected}
                title={productName}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/60',
                )}
              >
                <Thumb url={imageUrl} alt={productName} />
              </button>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1 disabled:opacity-50"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || isPending}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1 disabled:opacity-50"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || isPending}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
