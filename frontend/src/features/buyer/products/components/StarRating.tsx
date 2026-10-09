import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface StarRatingProps {
  rating: number;
  interactive?: boolean;
  size?: 'sm' | 'md';
  onRate?: (value: number) => void;
}

export function StarRating({
  rating,
  interactive = false,
  size = 'md',
  onRate,
}: StarRatingProps) {
  const { t } = useTranslation();
  const displayRating = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <div
      className="flex items-center gap-1"
      aria-label={t('buyer.products.rating.label', 'Rated {{rating}} out of 5', {
        rating: displayRating,
      })}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const value = index + 1;
        const filled = value <= Math.round(displayRating);

        return (
          <button
            key={value}
            type="button"
            aria-label={t(
              'buyer.products.rating.rateStar',
              value === 1 ? 'Rate {{count}} star' : 'Rate {{count}} stars',
              { count: value },
            )}
            disabled={!interactive}
            onClick={() => onRate?.(value)}
            className={cn(
              'p-0.5 transition-transform',
              interactive && 'cursor-pointer hover:scale-110',
              !interactive && 'cursor-default',
            )}
          >
            <Star
              className={cn(
                size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
                filled ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/70',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
