import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZES = [5, 20, 50, 100] as const

interface PaginationProps {
  page: number
  limit: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
}

function getPageNumbers(page: number, safeTotal: number): Array<number | 'gap'> {
  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1)
  }
  const pages: Array<number | 'gap'> = [1]
  if (page > 3) pages.push('gap')
  const start = Math.max(2, page - 1)
  const end = Math.min(safeTotal - 1, page + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (page < safeTotal - 2) pages.push('gap')
  pages.push(safeTotal)
  return pages
}

// Table footer: record count on the left, numbered page navigation on the
// right (prev/next chevrons + page chips) as in the admin ads mock.
export function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const safeTotal = Math.max(totalPages || 1, 1)
  const prevDisabled = page <= 1
  const nextDisabled = page >= safeTotal
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
      <div className="flex items-center gap-3">
        {onLimitChange && (
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span className="hidden sm:inline">Rows:</span>
            <select
              aria-label="Rows per page"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="h-8 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:border-primary/50 transition-colors"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        <span className="text-[13px] text-muted-foreground transition-opacity duration-200">
          Showing <span className="font-medium text-foreground">{from}–{to}</span> of{' '}
          <span className="font-medium text-foreground">{total}</span> ads
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous page"
          className={`h-8 w-8 rounded-md flex items-center justify-center border
            transition-all duration-200 ease-in-out active:scale-95
            ${prevDisabled
              ? 'bg-card border-border text-muted-foreground/40 cursor-not-allowed opacity-50 active:scale-100'
              : 'bg-card border-border text-muted-foreground cursor-pointer hover:bg-primary/10 hover:border-primary/50 hover:text-primary'
            }`}
          disabled={prevDisabled}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers(page, safeTotal).map((p, idx) => {
            if (p === 'gap') {
              return (
                <span key={`gap-${idx}`} className="px-1 text-xs text-muted-foreground select-none">
                  …
                </span>
              )
            }
            const isCurrent = p === page
            return (
              <button
                key={p}
                type="button"
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Go to page ${p}`}
                className={`h-8 w-8 rounded-md flex items-center justify-center text-[13px] font-medium border
                  transition-all duration-200 ease-in-out active:scale-95
                  ${isCurrent
                    ? 'bg-primary border-primary text-primary-foreground font-semibold shadow-sm scale-105'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-muted/50 cursor-pointer'
                  }`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          aria-label="Next page"
          className={`h-8 w-8 rounded-md flex items-center justify-center border
            transition-all duration-200 ease-in-out active:scale-95
            ${nextDisabled
              ? 'bg-card border-border text-muted-foreground/40 cursor-not-allowed opacity-50 active:scale-100'
              : 'bg-card border-border text-muted-foreground cursor-pointer hover:bg-primary/10 hover:border-primary/50 hover:text-primary'
            }`}
          disabled={nextDisabled}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}