import type { PaginationMeta } from '@/types/search.types'

interface PaginationProps {
  meta: PaginationMeta
  currentLimit?: number
  onLimitChange?: (limit: number) => void
  onPageChange?: (page: number) => void
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const totalPages = meta.totalPages ?? Math.ceil(meta.total / meta.limit)
  const safeTotal = Math.max(totalPages || 1, 1)

  return (
    <div className="mt-8 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] text-muted-foreground">
        Showing page{' '}
        <span className="font-medium text-foreground">{meta.page}</span>{' '}
        of{' '}
        <span className="font-medium text-foreground">{safeTotal}</span>
      </p>

      <div className="flex items-center gap-2">
        {onPageChange && (
          <div className="flex gap-1">
            <button
              type="button"
              className="w-8 h-8 rounded-md flex items-center justify-center text-[13px] border cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 bg-card border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              disabled={meta.page <= 1}
              onClick={() => onPageChange(meta.page - 1)}
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-md flex items-center justify-center text-[13px] border bg-primary border-primary text-primary-foreground cursor-default"
            >
              {meta.page}
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-md flex items-center justify-center text-[13px] border cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 bg-card border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              disabled={meta.page >= safeTotal}
              onClick={() => onPageChange(meta.page + 1)}
              aria-label="Next"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
