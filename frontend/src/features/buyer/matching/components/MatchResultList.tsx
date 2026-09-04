import { RecommendationCard } from './RecommendationCard'
import type { RecommendationProduct } from '@/schemas/matching.schema'

interface MatchResultListProps {
  products: RecommendationProduct[]
  source: 'ai' | 'generic'
  isLoading?: boolean
}

export function MatchResultList({ products, source, isLoading }: MatchResultListProps) {
  // TODO: Implement grid with loading skeleton
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded-lg h-64" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <RecommendationCard key={product.id} product={product} source={source} />
      ))}
    </div>
  )
}
