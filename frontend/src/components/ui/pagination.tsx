import { cn } from '@/lib/utils'

export interface TablePaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  limit: number
  onLimitChange: (limit: number) => void
  total: number
  itemLabel: string
  pageSizeOptions?: number[]
  className?: string
}

const navButtonClass = (disabled: boolean) =>
  cn(
    'h-8 px-2.5 rounded-md flex items-center justify-center text-[13px] border font-medium',
    'transition-all duration-200 ease-in-out active:scale-95',
    disabled
      ? 'bg-card border-border text-muted-foreground/40 cursor-not-allowed opacity-50 active:scale-100'
      : 'bg-card border-border text-muted-foreground cursor-pointer hover:bg-primary/10 hover:border-primary/50 hover:text-primary',
  )

const pageButtonClass = (isCurrent: boolean) =>
  cn(
    'h-8 w-8 rounded-md flex items-center justify-center text-[13px] font-medium border',
    'transition-all duration-200 ease-in-out active:scale-95',
    isCurrent
      ? 'bg-primary border-primary text-primary-foreground font-semibold shadow-sm scale-105'
      : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-muted/50 cursor-pointer',
  )

function buildPageItems(page: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
    return pages
  }
  pages.push(1)
  if (page > 3) pages.push('...')
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (page < totalPages - 2) pages.push('...')
  pages.push(totalPages)
  return pages
}

export function TablePagination({
  page,
  totalPages,
  onPageChange,
  limit,
  onLimitChange,
  total,
  itemLabel,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: TablePaginationProps) {
  const safeTotalPages = Math.max(totalPages || 1, 1)
  const prevDisabled = page <= 1
  const nextDisabled = page >= safeTotalPages

  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 select-none',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-muted-foreground">Row</span>
        <select
          aria-label="Rows per page"
          value={limit}
          onChange={(e) => {
            onLimitChange(Number(e.target.value))
            onPageChange(1)
          }}
          className="h-8 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:border-primary/50 transition-colors"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <span className="text-[13px] text-muted-foreground transition-opacity duration-200">
          Showing{' '}
          <span className="font-semibold text-foreground">
            {from}-{to}
          </span>{' '}
          of <span className="font-semibold text-foreground">{total}</span> {itemLabel}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          aria-label="Previous page"
          type="button"
          className={navButtonClass(prevDisabled)}
          disabled={prevDisabled}
          onClick={() => onPageChange(page - 1)}
        >
          ‹ Prev
        </button>

        <div className="flex items-center gap-1">
          {buildPageItems(page, safeTotalPages).map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-xs text-muted-foreground select-none"
                >
                  •••
                </span>
              )
            }
            const isCurrent = p === page
            return (
              <button
                key={p}
                type="button"
                aria-current={isCurrent ? 'page' : undefined}
                className={pageButtonClass(isCurrent)}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
          })}
        </div>

        <button
          aria-label="Next page"
          type="button"
          className={navButtonClass(nextDisabled)}
          disabled={nextDisabled}
          onClick={() => onPageChange(page + 1)}
        >
          Next ›
        </button>
      </div>
    </div>
  )
}
