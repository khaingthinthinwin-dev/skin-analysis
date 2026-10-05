import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, ArrowRight, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import type { AdSlide } from '@/schemas/matching.schema'

const AUTO_SLIDE_MS = 5000

interface AdSlidePanelProps {
  ads?: AdSlide[]
  onImpression?: (adIds: string[]) => void
  onClick?: (adId: string) => void
}

function getImageUrl(url: string | null): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
  const base = raw.replace(/\/api\/v1\/?$/, '')
  return base + (url.startsWith('/') ? url : `/${url}`)
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
  const { isAuthenticated } = useAuth()
  const basePath = isAuthenticated ? '/buyer/products' : '/products'

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
  const trackClick = () => onClick?.(ad.adId)
  // Prefer the product behind the ad image, then an internal link, then the outbound link.
  const adProduct = ad.productSlug ?? ad.productId ?? null
  const internalPath = adProduct
    ? `${basePath}/${adProduct}`
    : ad.linkUrl && ad.linkUrl.startsWith('/')
      ? ad.linkUrl
      : null
  const externalUrl = internalPath ? null : ad.linkUrl || null
  const LearnMoreContent = (
    <>
      Learn more
      <ArrowRight className="w-4 h-4 ml-2" />
    </>
  )

  return (
    <div
      ref={panelRef}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={() => setIsFocused(false)}
      aria-roledescription="carousel"
      aria-label="Sponsored advertisements"
    >
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/50">
        <div className="relative px-12 sm:px-14 md:px-16 py-6 md:py-8 bg-gradient-to-r from-purple-900/90 via-indigo-900/80 to-purple-950/90 text-white transition-all duration-700">
          <div className="relative z-10 grid gap-5 md:grid-cols-12 md:items-center">
            <div className="space-y-3 md:col-span-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs uppercase tracking-wider font-semibold py-1 px-3"
                >
                  <Megaphone className="w-3.5 h-3.5 mr-1 inline" />
                  Sponsored
                </Badge>
                {ad.shopName && (
                  <Badge className="bg-accent text-white font-bold text-xs py-1 px-3">
                    {ad.shopName}
                  </Badge>
                )}
              </div>

              <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-white leading-tight">
                {ad.title}
              </h2>

              {ad.description && (
                <p className="text-sm sm:text-base text-zinc-200/90 max-w-xl line-clamp-2">
                  {ad.description}
                </p>
              )}
              {ad.sku ? (
                <Button
                  variant="link"
                  className="p-0 h-auto mt-2"
                  onClick={() => {
                    onClick?.(ad.adId)
                  }}
                >
                  {ad.ctaText || 'Shop Now'}
                </Button>
              ) : (
                <div className="w-36 h-36 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center p-4 text-center shadow-inner">
                  <Megaphone className="w-10 h-10 text-white/80 mb-2" />
                  <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                    Merchant Partner
                  </span>
                </div>
              )}
            </div>
          </div>

          {ads.length > 1 && (
            <>
              <div className="absolute left-3 top-1/2 z-20 -translate-y-1/2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous advertisement"
                  onClick={prev}
                  className="h-9 w-9 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/20 shadow-md"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </div>
              <div className="absolute right-3 top-1/2 z-20 -translate-y-1/2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next advertisement"
                  onClick={next}
                  className="h-9 w-9 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/20 shadow-md"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              <div className="absolute left-1/2 bottom-3 z-20 -translate-x-1/2 flex items-center gap-2">
                {ads.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Go to advertisement ${idx + 1}`}
                    aria-current={idx === displayIndex ? 'true' : undefined}
                    onClick={() => setCurrent(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === displayIndex ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  )
}
