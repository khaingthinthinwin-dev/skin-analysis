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

  const btnClass = (active = false): string =>
    `w-8 h-8 rounded-md flex items-center justify-center text-[13px] border cursor-pointer ${
      active
        ? 'bg-primary border-primary text-primary-foreground cursor-default'
        : 'bg-card border-border text-muted-foreground'
    }`;

  return (
    <div className="flex items-center justify-between mt-4">
      <span className="text-[13px] text-muted-foreground">
        Showing page {page} of {safeTotal}
      </span>
      <div className="flex gap-1">
        <button className={btnClass()} disabled={prevDisabled} onClick={() => onPageChange(page - 1)}>
          ‹
        </button>
        <button className={btnClass(true)}>{page}</button>
        <button className={btnClass()} disabled={nextDisabled} onClick={() => onPageChange(page + 1)}>
          ›
        </button>
      </div>
    </div>
  );
};
