import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  totalReviews: number
}

export function StarRating({ rating, totalReviews }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${rating.toFixed(1)} out of 5 stars from ${totalReviews} reviews`}>
      <div className="flex items-center" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => {
          const fill = Math.min(Math.max(rating - index, 0), 1)
          return (
            <span key={index} className="relative inline-flex">
              <Star className="h-3.5 w-3.5 fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700" />
              {fill > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: fill >= 1 ? '100%' : '50%' }}
                >
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                </span>
              )}
            </span>
          )
        })}
      </div>
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {rating.toFixed(1)} ({totalReviews})
      </span>
    </div>
  )
}