import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ChevronLeft, ChevronRight, Megaphone, Image as ImageIcon } from 'lucide-react'
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
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const panelRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const { isAuthenticated } = useAuth()
  const basePath = isAuthenticated ? '/buyer/products' : '/products'

  const paused = isHovered || reducedMotion

  // Clamp the slide when the ad list shrinks (e.g. schedule filtering)
  // without resetting the 5s interval. Deriving directly keeps the
  // rotation timer intact and avoids a setState-in-effect cascade.
  const displayIndex = ads.length > 0 ? current % ads.length : 0

  const next = useCallback(() => {
    if (ads.length <= 1) return
    setCurrent((prev) => (prev + 1) % ads.length)
  }, [ads.length])

  // A dead image URL (404 / bad path) falls back to the clean white
  // placeholder instead of the broken-image glyph + alt text.
  const handleImageError = useCallback((adId: string) => {
    setFailedImages((prev) => new Set(prev).add(adId))
  }, [])

  useEffect(() => {
    if (paused || ads.length <= 1) return
    const timer = setInterval(next, AUTO_SLIDE_MS)
    return () => clearInterval(timer)
  }, [paused, ads.length, next])

  const prev = useCallback(() => {
    if (ads.length <= 1) return
    setCurrent((prev) => (prev - 1 + ads.length) % ads.length)
  }, [ads.length])

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
  // Same click-through rule as the product-detail sidebar ad: the product the
  // ad's sku/image resolves to, otherwise no link.
  const adProduct = ad.productSlug ?? ad.productId ?? null
  const productPath = adProduct ? `${basePath}/${adProduct}` : null
  const announcement = ad.announcementMessage
  const content = ad.description

  return (
    <div
      ref={panelRef}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-roledescription="carousel"
      aria-label="Sponsored advertisements"
    >
      <div className="relative overflow-hidden rounded-3xl shadow-2xl border border-border/50">
        <div className="relative overflow-hidden px-11 sm:px-14 md:px-16 py-6 md:py-8 bg-gradient-to-r from-purple-900/90 via-indigo-900/80 to-purple-950/90 text-white transition-all duration-700">
          <div className="relative z-10 grid gap-5 lg:gap-3 md:grid-cols-12 md:items-center">
            <div className="space-y-3 md:col-span-8 min-w-0 flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[11px] sm:text-xs uppercase tracking-wider font-semibold py-1 px-3 max-w-full"
                  title={announcement || 'Sponsored'}
                >
                  <Megaphone className="w-3.5 h-3.5 mr-1 inline shrink-0" />
                  <span className="truncate">{announcement || 'Sponsored'}</span>
                </Badge>
                {ad.shopName && (
                  <Badge className="bg-accent text-white font-bold text-[11px] sm:text-xs py-1 px-3">
                    {ad.shopName}
                  </Badge>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
                {ad.title}
              </h2>

              {content && (
                <p className="text-sm sm:text-base text-zinc-200/90 max-w-none leading-relaxed">
                  {content}
                </p>
              )}

              <div className="pt-2">
                {productPath ? (
                  <Button
                    asChild
                    size="lg"
                    className="h-9 gap-1.5 px-5 bg-white text-zinc-900 hover:bg-zinc-100 text-xs sm:text-sm font-semibold shadow-lg"
                  >
                    <Link to={productPath} onClick={() => onClick?.(ad.adId)}>
                      Learn more
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="link"
                    className="p-0 h-auto text-purple-200"
                    onClick={() => onClick?.(ad.adId)}
                  >
                    {ad.ctaText || 'Shop Now'}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-center self-center overflow-hidden rounded-[1.75rem] md:col-span-4">
              {ad.imageUrl && !failedImages.has(ad.adId) ? (
                  <img
                    src={getImageUrl(ad.imageUrl)}
                    alt={ad.title}
                    loading="lazy"
                    onError={() => handleImageError(ad.adId)}
                    className="block h-48 w-auto max-w-full rounded-[1.75rem] object-contain shadow-inner sm:h-56"
                  />
              ) : (
                <div className="flex w-full max-w-sm aspect-[16/10] items-center justify-center rounded-2xl bg-white shadow-inner">
                  <ImageIcon className="h-8 w-8 text-purple-300" />
                </div>
              )}
            </div>
          </div>

          {ads.length > 1 && (
            <>
              <div className="absolute left-2 sm:left-3 top-1/2 z-20 -translate-y-1/2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous advertisement"
                  onClick={prev}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/20 shadow-md"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
              <div className="absolute right-2 sm:right-3 top-1/2 z-20 -translate-y-1/2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next advertisement"
                  onClick={next}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/20 shadow-md"
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>

              <div className="absolute left-1/2 bottom-2 sm:bottom-3 z-20 -translate-x-1/2 flex items-center gap-2">
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

      <p className="text-xs text-muted-foreground text-center mt-2 italic">
        Sponsored products are paid placements from merchants
      </p>
    </div>
  )
}
