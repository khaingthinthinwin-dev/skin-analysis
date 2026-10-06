import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Megaphone, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSponsoredAds } from '../hooks/useCheckout'
import { getImageUrl } from '@/lib/image-url';

const AUTO_SLIDE_MS = 5000
const BUYER_PRODUCTS_FALLBACK = '/buyer/products'

function getProductDetailHref(sku: string | null) {
  const trimmedSku = sku?.trim()
  if (!trimmedSku) return BUYER_PRODUCTS_FALLBACK

  return `/buyer/products/${encodeURIComponent(trimmedSku)}`
}

function usePrefersReducedMotion() {
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  return reduced
}

export function SponsoredAdSlider() {
  const { data } = useSponsoredAds()
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
  const ctaHref = getProductDetailHref(ad.sku)

  return (
    <Card
      className="relative overflow-hidden rounded-[1.75rem] border-0 shadow-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-roledescription="carousel"
      aria-label="Sponsored advertisements"
    >
      <CardContent
        className="relative min-h-[15rem] bg-gradient-to-r from-[#78349a] via-[#5c5a9f] to-[#562779] px-12 py-6 text-white transition-all duration-700 sm:min-h-[15.5rem] sm:px-16 sm:py-6"
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={() => setIsFocused(false)}
      >
        <div className="relative z-10 grid items-center gap-5 sm:grid-cols-12 sm:gap-5 lg:gap-6">
          <div className="flex min-w-0 flex-col gap-3 sm:col-span-7 sm:gap-3.5 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">
                <Megaphone className="h-3.5 w-3.5" /> Sponsored
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-500/25 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-purple-100 backdrop-blur-md sm:text-xs">
                <Sparkles className="h-3.5 w-3.5 text-purple-200" /> Featured Promotion
              </span>
            </div>

            <h3 className="text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl lg:text-[1.625rem]">
              {ad.title}
            </h3>

            {ad.description && (
              <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                {ad.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <Button asChild size="lg" className="h-12 gap-4 rounded-md bg-[#f8f7f5] px-8 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-white sm:text-base">
                <a href={ctaHref}>
                  Learn more
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {ad.imageUrl && (
            <div className="flex min-w-0 items-center justify-center sm:col-span-5 lg:col-span-5">
              <div className="w-full max-w-[22rem] overflow-hidden rounded-2xl border-4 border-white/90 bg-[#fffaf5] shadow-2xl">
                <img
                  src={getImageUrl(ad.imageUrl)}
                  alt={ad.title}
                  className="aspect-[1.74] h-auto w-full object-cover"
                />
              </div>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={prev}
          disabled={ads.length <= 1}
          aria-label="Previous advertisement"
          className="absolute left-3 top-1/2 z-20 h-9 w-9 -translate-y-1/2 rounded-full border border-white/15 bg-black/25 text-white shadow-sm transition-colors hover:bg-black/40 hover:text-white sm:left-3"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={next}
          disabled={ads.length <= 1}
          aria-label="Next advertisement"
          className="absolute right-3 top-1/2 z-20 h-9 w-9 -translate-y-1/2 rounded-full border border-white/15 bg-black/25 text-white shadow-sm transition-colors hover:bg-black/40 hover:text-white sm:right-3"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {ads.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {ads.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to advertisement ${idx + 1}`}
                aria-current={idx === displayIndex ? 'true' : undefined}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${idx === displayIndex ? 'w-8 bg-white' : 'w-2 bg-white/45 hover:bg-white/75'}`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
