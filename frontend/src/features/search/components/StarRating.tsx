import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface StarRatingProps {
  rating: number
  totalReviews: number
}

export function StarRating({ rating, totalReviews }: StarRatingProps) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-1.5" aria-label={t('buyer.search.ratingSummary', `${rating.toFixed(2)} out of 5 stars from ${totalReviews} reviews`, { rating: rating.toFixed(2), count: totalReviews })}>
      <div className="flex items-center" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            className={`h-3.5 w-3.5 ${
              index < Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'
            }`}
          />
        ))}
      </div>
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {rating.toFixed(2)} ({totalReviews})
      </span>
    </div>
  )
}