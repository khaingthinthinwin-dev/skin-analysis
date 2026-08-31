import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import type { RecommendationProduct } from '@/schemas/matching.schema'

interface RecommendationCardProps {
  product: RecommendationProduct
  source: 'ai' | 'generic'
}

export function RecommendationCard({ product, source }: RecommendationCardProps) {
  // TODO: Implement recommendation card
  return (
    <Link to={`/buyer/products/${product.slug}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="aspect-square bg-muted relative">
          {source === 'ai' && product.matchScore !== null && (
            <Badge className="absolute top-2 right-2 bg-emerald-100 text-emerald-800">
              {product.matchScore}% match
            </Badge>
          )}
          {source === 'generic' && product.categoryBadge && (
            <Badge className="absolute top-2 right-2">
              {product.categoryBadge}
            </Badge>
          )}
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold line-clamp-1">{product.name}</h3>
          <div className="flex gap-1 flex-wrap">
            {product.skinTypes.map((type) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold">${product.price}</span>
            {!product.isInStock && (
              <Badge variant="destructive">Out of Stock</Badge>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
