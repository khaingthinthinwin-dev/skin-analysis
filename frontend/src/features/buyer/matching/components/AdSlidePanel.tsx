import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AdSlide } from '@/schemas/matching.schema'

interface AdSlidePanelProps {
  ads: AdSlide[]
  onImpression?: (adIds: string[]) => void
  onClick?: (adId: string) => void
}

export function AdSlidePanel({ ads, onImpression, onClick }: AdSlidePanelProps) {
  // TODO: Implement ad carousel with auto-slide
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // TODO: Implement 5-second auto-rotation
    // TODO: Implement IntersectionObserver for impression tracking
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (!ads.length) return null

  return (
    <div className="relative">
      <Card className="p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrent((c) => (c > 0 ? c - 1 : ads.length - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 flex items-center gap-4">
            {ads[current]?.imageUrl && (
              <img
                src={ads[current].imageUrl}
                alt={ads[current].title}
                className="w-24 h-24 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h4 className="font-semibold">{ads[current]?.title}</h4>
              {ads[current]?.description && (
                <p className="text-sm text-muted-foreground">{ads[current].description}</p>
              )}
              <Button
                variant="link"
                className="p-0 h-auto mt-2"
                onClick={() => ads[current]?.adId && onClick?.(ads[current].adId)}
              >
                {ads[current]?.ctaText || 'Shop Now'}
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrent((c) => (c < ads.length - 1 ? c + 1 : 0))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground text-center mt-2 italic">
        Sponsored products are paid placements from merchants
      </p>
    </div>
  )
}
