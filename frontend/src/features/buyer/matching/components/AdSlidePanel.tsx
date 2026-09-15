import { useState, useEffect, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AdSlide } from '@/schemas/matching.schema'

const AUTO_SLIDE_MS = 5000

interface AdSlidePanelProps {
  ads?: AdSlide[]
  onImpression?: (adIds: string[]) => void
  onClick?: (adId: string) => void
}

function usePrefersReducedMotion() {
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  return reduced
}

export function AdSlidePanel({ ads = [], onImpression, onClick }: AdSlidePanelProps) {
  const [current, setCurrent] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  const paused = isHovered || isFocused || reducedMotion
  const displayIndex = ads.length > 0 ? current % ads.length : 0

  const next = useCallback(() => {
    if (ads.length <= 1) return
    setCurrent((prev) => (prev + 1) % ads.length)
  }, [ads.length])

  const prev = useCallback(() => {
    if (ads.length <= 1) return
    setCurrent((prev) => (prev - 1 + ads.length) % ads.length)
  }, [ads.length])

  useEffect(() => {
    if (paused || ads.length <= 1) return
    const timer = setInterval(next, AUTO_SLIDE_MS)
    return () => clearInterval(timer)
  }, [paused, ads.length, next])

  useEffect(() => {
    if (!panelRef.current || !onImpression || ads.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onImpression(ads.map((ad) => ad.adId))
          }
        })
      },
      { threshold: 0.5 }
    )

    observer.observe(panelRef.current)
    return () => observer.disconnect()
  }, [ads, onImpression])

  if (!ads.length) return null

  const ad = ads[displayIndex]

  return (
    <div
      ref={panelRef}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-roledescription="carousel"
      aria-label="Sponsored advertisements"
    >
      <Card className="p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            disabled={ads.length <= 1}
            aria-label="Previous advertisement"
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div
            className="flex-1 flex items-center gap-4"
            onFocusCapture={() => setIsFocused(true)}
            onBlurCapture={() => setIsFocused(false)}
          >
            {ad.imageUrl && (
              <img
                src={ad.imageUrl}
                alt={ad.title}
                className="w-24 h-24 object-cover rounded shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{ad.title}</h4>
              {ad.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{ad.description}</p>
              )}
              {ad.linkUrl ? (
                <Button
                  variant="link"
                  className="p-0 h-auto mt-2"
                  onClick={() => {
                    onClick?.(ad.adId)
                    window.open(ad.linkUrl!, '_blank', 'noopener,noreferrer')
                  }}
                >
                  {ad.ctaText || 'Shop Now'}
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground mt-2 inline-block">
                  {ad.ctaText}
                </span>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            disabled={ads.length <= 1}
            aria-label="Next advertisement"
            className="shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {ads.length > 1 && (
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {ads.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to advertisement ${idx + 1}`}
                aria-current={idx === displayIndex ? 'true' : undefined}
                onClick={() => setCurrent(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === displayIndex
                    ? 'w-4 bg-purple-500'
                    : 'w-1.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        )}
      </Card>

      <p className="text-xs text-muted-foreground text-center mt-2 italic">
        Sponsored products are paid placements from merchants
      </p>
    </div>
  )
}
