import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Shield,
  Sparkles,
  ChevronRight,
  Package,
} from 'lucide-react'
import { useRecommendationFeedback } from '../hooks/useRecommendationFeedback'
import { PRIORITY_COLORS } from '../types/skin-analysis.types'
import { productService } from '@/features/buyer/products/services/product.service'
import { getImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import type { RecommendationDto } from '../types/skin-analysis.types'

interface ProductRecommendationCardProps {
  recommendation: RecommendationDto
  index: number
}

export function ProductRecommendationCard({ recommendation, index }: ProductRecommendationCardProps) {
  const { t } = useTranslation('skin')
  const navigate = useNavigate()
  const feedbackMutation = useRecommendationFeedback()
  const [feedback, setFeedback] = useState<'helpful' | 'notHelpful' | null>(
    recommendation.isHelpful === true ? 'helpful' : recommendation.isHelpful === false ? 'notHelpful' : null,
  )
  const [imageError, setImageError] = useState(false)

  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ['product-image', recommendation.productId],
    queryFn: () => productService.getDetail(recommendation.productId),
    enabled: !!recommendation.productId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const imageUrl = product?.images?.[0] ? getImageUrl(product.images[0]) : ''

  const priorityColor = PRIORITY_COLORS[recommendation.priority]

  const handleFeedback = (isHelpful: boolean) => {
    if (feedback === (isHelpful ? 'helpful' : 'notHelpful')) return

    feedbackMutation.mutate(
      { recommendationId: recommendation.recommendationId, isHelpful },
      {
        onSuccess: () => {
          setFeedback(isHelpful ? 'helpful' : 'notHelpful')
        },
      },
    )
  }

  const handleViewProduct = (e: React.MouseEvent) => {
    e.preventDefault()
    navigate(`/buyer/products/${recommendation.productId}`)
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative h-36 w-full overflow-hidden bg-muted">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={recommendation.productName}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {isProductLoading ? (
              <div className="h-full w-full animate-pulse bg-muted" />
            ) : (
              <Package className="h-8 w-8 opacity-60" />
            )}
          </div>
        )}
        <Badge
          variant="outline"
          className={cn('absolute right-2 top-2 bg-background/95 font-medium shadow-sm backdrop-blur', priorityColor)}
        >
          {recommendation.priority === 'HIGH' && <Sparkles className="mr-1 h-3 w-3" />}
          {recommendation.priority === 'MEDIUM' && <Shield className="mr-1 h-3 w-3" />}
          {t(`priority.${recommendation.priority.toLowerCase()}`)}
        </Badge>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">{index + 1}.</span>
            <CardTitle className="text-lg">{recommendation.productName}</CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{recommendation.reason}</p>

        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs">
            {recommendation.productType}
          </Badge>
        </div>

        {/* Feedback Buttons */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {t('feedback.wasHelpful')}
            </span>
            <Button variant="ghost" size="sm" onClick={handleViewProduct} className="gap-1">
              <span>{t('recommendations.viewProduct')}</span>
              <ExternalLink className="h-4 w-4" />
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={feedback === 'helpful' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFeedback(true)}
              disabled={feedbackMutation.isPending}
              className={cn(
                'gap-1',
                feedback === 'helpful'
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'text-muted-foreground hover:text-emerald-600',
              )}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>{t('feedback.helpful')}</span>
            </Button>
            <Button
              variant={feedback === 'notHelpful' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => handleFeedback(false)}
              disabled={feedbackMutation.isPending}
              className={cn(
                'gap-1',
                feedback === 'notHelpful' ? 'bg-red-500 text-white border-red-500' : '',
              )}
            >
              <ThumbsDown className="h-4 w-4" />
              <span>{t('feedback.notHelpful')}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}