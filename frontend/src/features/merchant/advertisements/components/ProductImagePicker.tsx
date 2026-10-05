import { useState } from 'react'
import { ChevronLeft, ChevronRight, ImageIcon, Images } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useProducts } from '@/hooks/useProducts'
import { getImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 3

interface ProductImagePickerProps {
  value: string
  onChange: (imageUrl: string) => void
  /** Message shown under the trigger button, e.g. the form-level validation error. */
  error?: string
}

interface SelectProductImageDialogProps {
  value: string
  onSelect: (imageUrl: string) => void
  onClose: () => void
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
 *
 * Only the trigger button lives inside the content-upload dialog; the browsable
 * grid is deferred into its own "Select Product Image" dialog, which is mounted
 * lazily so the product request only runs once the merchant opens it.
 */
export function ProductImagePicker({ value, onChange, error }: ProductImagePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={() => setOpen(true)} aria-label="Choose image">
        <Images className="mr-2 h-4 w-4" />
        {value ? 'Change Image' : 'Choose Image'}
      </Button>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {open && (
        <SelectProductImageDialog
          value={value}
          onSelect={(imageUrl) => {
            onChange(imageUrl)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

function SelectProductImageDialog({ value, onSelect, onClose }: SelectProductImageDialogProps) {
  const [page, setPage] = useState(1)
  // Staged choice: clicking a thumbnail only previews it here, the footer Confirm
  // button is what commits it to the form (Cancel discards the staged value).
  const [selected, setSelected] = useState(value)

  const { data, isPending, isError } = useProducts({ page, limit: PAGE_SIZE })

  const products = data?.items ?? []
  // Only products that actually have an image can contribute a choice.
  const options = products.flatMap((product) =>
    product.images.map((imageUrl) => ({ imageUrl, productName: product.name, sku: product.sku })),
  )
  const totalPages = data?.meta.totalPages ?? 0

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-1rem)] flex-col overflow-y-auto sm:max-w-3xl sm:w-full">
        <DialogHeader>
          <DialogTitle>Select Product Image</DialogTitle>
          <DialogDescription>Pick one of the images attached to your own products.</DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="grid flex-1 grid-cols-3 gap-3">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <Skeleton key={index} className="h-full min-h-[10rem] w-full rounded-lg sm:min-h-[16rem]" />
            ))}
          </div>
        ) : isError ? (
          <p role="alert" className="text-sm text-destructive">
            Could not load your product images. Please try again.
          </p>
        ) : options.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            You have no product images yet. Upload an image to one of your products first.
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-3 gap-3">
            {options.map(({ imageUrl, productName, sku }) => {
              const isSelected = selected === imageUrl
              return (
                <button
                  key={imageUrl}
                  type="button"
                  onClick={() => setSelected(imageUrl)}
                  aria-pressed={isSelected}
                  title={productName}
                  className={cn(
                    'relative h-full min-h-[10rem] w-full overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-[16rem]',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-muted-foreground/25 hover:border-muted-foreground/60',
                  )}
                >
                  <Thumb url={imageUrl} alt={productName} />
                  {sku && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-center text-xs font-medium text-white">
                      {sku}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {!isPending && !isError && totalPages > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || isPending}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Prev
              </Button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <Button
                  key={pageNumber}
                  type="button"
                  size="sm"
                  variant={pageNumber === page ? 'default' : 'outline'}
                  onClick={() => setPage(pageNumber)}
                  aria-current={pageNumber === page ? 'page' : undefined}
                >
                  {pageNumber}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || isPending}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => selected && onSelect(selected)} disabled={!selected}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}