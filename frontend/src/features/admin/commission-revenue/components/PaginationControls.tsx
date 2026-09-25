import React from 'react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Simple prev/next pagination used for the commission reports table and
// the revenue payouts table (DD_02 §4 [F1] / [M2]).
export const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  totalPages,
  onPageChange,
}) => {
  const safeTotal = Math.max(totalPages || 1, 1);
  const prevDisabled = page <= 1;
  const nextDisabled = page >= safeTotal;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (safeTotal <= 7) {
      for (let i = 1; i <= safeTotal; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(safeTotal - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < safeTotal - 2) pages.push('...');
      pages.push(safeTotal);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      <span className="text-[13px] text-muted-foreground transition-opacity duration-200">
        Showing page <span className="font-semibold text-foreground">{page}</span> of{' '}
        <span className="font-semibold text-foreground">{safeTotal}</span>
      </span>
      <div className="flex items-center gap-1.5">
        <button
          aria-label="Previous page"
          type="button"
          className={`h-8 px-2.5 rounded-md flex items-center justify-center text-[13px] border font-medium
            transition-all duration-200 ease-in-out active:scale-95
            ${prevDisabled
              ? 'bg-card border-border text-muted-foreground/40 cursor-not-allowed opacity-50 active:scale-100'
              : 'bg-card border-border text-muted-foreground cursor-pointer hover:bg-primary/10 hover:border-primary/50 hover:text-primary'
            }`}
          disabled={prevDisabled}
          onClick={() => onPageChange(page - 1)}
        >
          ‹ Prev
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground select-none">
                  •••
                </span>
              );
            }
            const isCurrent = p === page;
            return (
              <button
                key={p}
                type="button"
                aria-current={isCurrent ? 'page' : undefined}
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
            );
          })}
        </div>

        <button
          aria-label="Next page"
          type="button"
          className={`h-8 px-2.5 rounded-md flex items-center justify-center text-[13px] border font-medium
            transition-all duration-200 ease-in-out active:scale-95
            ${nextDisabled
              ? 'bg-card border-border text-muted-foreground/40 cursor-not-allowed opacity-50 active:scale-100'
              : 'bg-card border-border text-muted-foreground cursor-pointer hover:bg-primary/10 hover:border-primary/50 hover:text-primary'
            }`}
          disabled={nextDisabled}
          onClick={() => onPageChange(page + 1)}
        >
          Next ›
        </button>
      </div>
    </div>
  );
};
