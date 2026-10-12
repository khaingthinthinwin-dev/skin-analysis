import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const displayRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const starSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className="flex items-center gap-1" aria-label={`Rated ${displayRating} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const value = index + 1;
        const fill = Math.min(Math.max(displayRating - index, 0), 1);

        const starVisual = (
          <span className="relative block">
            <Star
              className={cn(
                starSize,
                'fill-transparent stroke-[1.5] text-muted-foreground/70',
              )}
            />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: fill >= 1 ? '100%' : '50%' }}
                aria-hidden="true"
              >
                <Star
                  className={cn(
                    starSize,
                    'fill-yellow-400 stroke-yellow-500 text-yellow-500',
                  )}
                />
              </span>
            )}
          </span>
        );

        if (!interactive) {
          return (
            <span key={value} className="p-0.5">
              {starVisual}
            </span>
          );
        }

        return (
          <button
            key={value}
            type="button"
            aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
            onClick={() => onRate?.(value)}
            className="cursor-pointer p-0.5 transition-transform hover:scale-110"
          >
            {starVisual}
          </button>
        );
      })}
    </div>
  );
}
