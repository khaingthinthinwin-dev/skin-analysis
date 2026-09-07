import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSponsoredAds } from '../hooks/useSponsoredAds'

const AUTO_SLIDE_MS = 5000

function usePrefersReducedMotion() {
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  return reduced
}

export function SponsoredAdSlider() {
  const { data } = useSponsoredAds('search_top')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  const ads = data?.data ?? []
  const displayIndex = ads.length > 0 ? currentIndex % ads.length : 0

  const paused = isHovered || isFocused || reducedMotion

  const next = useCallback(() => {
    if (ads.length <= 1) return
    setCurrentIndex((prev) => (prev + 1) % ads.length)
  }, [ads.length])

  const prev = useCallback(() => {
    if (ads.length <= 1) return
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length)
  }, [ads.length])

  useEffect(() => {
    if (paused || ads.length <= 1) return
    const timer = setInterval(next, AUTO_SLIDE_MS)
    return () => clearInterval(timer)
  }, [paused, ads.length, next])

  if (!ads.length) return null

  const ad = ads[displayIndex]

  return (
    <Card
      className="relative overflow-hidden border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-roledescription="carousel"
      aria-label="Sponsored advertisements"
    >
      <CardContent
        className="p-4"
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={() => setIsFocused(false)}
      >
        <span className="mb-2 inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          <Megaphone className="h-3 w-3" /> Sponsored
        </span>

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="icon" onClick={prev} disabled={ads.length <= 1} aria-label="Previous advertisement" className="shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-1 items-center gap-4 px-2">
            {ad.imageUrl && (
              <img src={ad.imageUrl} alt={ad.title} className="hidden h-16 w-24 shrink-0 object-cover rounded-md sm:block" />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold">{ad.title}</h3>
              {ad.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{ad.description}</p>
              )}
              {ad.linkUrl && (
                <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  Learn more <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={next} disabled={ads.length <= 1} aria-label="Next advertisement" className="shrink-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {ads.length > 1 && (
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {ads.map((_, idx) => (
              <button key={idx} type="button" aria-label={`Go to advertisement ${idx + 1}`} aria-current={idx === displayIndex ? 'true' : undefined} onClick={() => setCurrentIndex(idx)} className={`h-1.5 rounded-full transition-all ${idx === displayIndex ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
