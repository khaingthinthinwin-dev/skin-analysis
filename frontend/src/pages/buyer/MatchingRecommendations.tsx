import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Wand2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MatchResultList } from '@/features/buyer/matching/components/MatchResultList'
import { ProfilePromptBanner } from '@/features/buyer/matching/components/ProfilePromptBanner'
import { AdSlidePanel } from '@/features/buyer/matching/components/AdSlidePanel'
import { RecommendationHistory } from '@/features/buyer/matching/components/RecommendationHistory'
import { SkinTypeFilter } from '@/features/buyer/matching/components/SkinTypeFilter'
import { usePersonalizedRecommendations, useRecommendationHistory, useAdPanel } from '@/features/buyer/matching/hooks/useMatching'

export default function MatchingRecommendations() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedSkinTypes, setSelectedSkinTypes] = useState<string[]>([])

  // TODO: Parse search params and fetch data
  const params = {
    skinTypes: searchParams.get('skinTypes') || undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    sort: searchParams.get('sort') as any || undefined,
    order: searchParams.get('order') as any || undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
  }

  const { data, isLoading } = usePersonalizedRecommendations(params)
  const { data: historyData } = useRecommendationHistory()
  const { data: adData } = useAdPanel()

  const source = data?.source || 'generic'

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Recommended for You
        </h1>
        <Badge variant={source === 'ai' ? 'default' : 'secondary'} className="mt-2">
          {source === 'ai' ? '🧬 AI Analysis' : '⬡ General Picks'}
        </Badge>
      </div>

      {/* Profile Prompt Banner */}
      <ProfilePromptBanner source={source} />

      {/* Ad Panel */}
      {adData?.data && (
        <AdSlidePanel ads={adData.data} />
      )}

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <SkinTypeFilter
            selected={selectedSkinTypes}
            onChange={setSelectedSkinTypes}
          />
          {/* TODO: Add price range, ingredients, sort filters */}
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <MatchResultList
            products={data?.data || []}
            source={source}
            isLoading={isLoading}
          />

          {/* TODO: Add pagination */}
        </div>
      </div>

      {/* History Section */}
      {historyData?.data && historyData.data.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Previously Recommended</h2>
          <RecommendationHistory sessions={historyData.data} />
        </section>
      )}
    </div>
  )
}
