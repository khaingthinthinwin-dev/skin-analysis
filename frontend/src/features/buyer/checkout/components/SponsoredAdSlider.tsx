import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Megaphone, ShoppingBag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSponsoredAds } from '../hooks/useCheckout'
import { getImageUrl } from '@/lib/image-url';

const AUTO_SLIDE_MS = 5000
const BUYER_PRODUCTS_FALLBACK = '/buyer/products'

const BATCH_DETAILS = 'Batch 2026-A7 · Lot #EM-4821 · 30ml'

function padIndex(value: number) {
  return String(value).padStart(2, '0')
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
  const ctaHref = ad.linkUrl ?? BUYER_PRODUCTS_FALLBACK

  return (
    <Card
      className="relative overflow-hidden rounded-2xl border-border/50 bg-muted shadow-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-roledescription="carousel"
      aria-label="Sponsored advertisements"
    >
      <CardContent
        className="relative min-h-0 p-4 bg-gradient-to-r from-purple-900/90 via-indigo-900/80 to-purple-950/90 text-white transition-all duration-700 sm:p-5"
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={() => setIsFocused(false)}
      >
        <div className="relative z-10 grid items-center gap-5 pl-2.5 sm:grid-cols-12 sm:gap-5 sm:pl-3 lg:gap-6">
          <div className="flex min-w-0 flex-col gap-3 sm:col-span-7 sm:gap-3.5 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-md sm:text-[10px]">
                <Megaphone className="h-3 w-3" /> Sponsored
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-500/25 px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-200 backdrop-blur-md sm:text-[10px]">
                <Sparkles className="h-3 w-3 text-purple-300" /> Featured Promotion
              </span>
            </div>

            <h3 className="text-lg font-extrabold leading-snug tracking-tight text-white sm:text-xl lg:text-2xl">
              {ad.title}
            </h3>

            {ad.description && (
              <p className="line-clamp-2 max-w-xl text-xs leading-relaxed text-zinc-200/90 sm:text-sm">
                {ad.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <Button asChild size="sm" className="h-8.5 gap-2 rounded-full bg-white px-4.5 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-md shadow-black/25 transition-all hover:bg-zinc-100 hover:shadow-lg sm:h-9">
                <a href={ctaHref} target="_blank" rel="noopener noreferrer" aria-label="Explore Acne Solutions">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Learn More
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>

          </div>

          {ad.imageUrl && (
            <div className="flex min-w-0 items-center justify-center sm:col-span-5 lg:col-span-5">
              <div className="relative mx-auto aspect-[16/10] h-40 w-full max-w-[18rem] overflow-hidden rounded-2xl border border-white/20 shadow-2xl sm:h-44 sm:max-w-[20rem] lg:h-48 lg:max-w-[22rem]">
                <img
                  src={getImageUrl(ad.imageUrl)}
                  alt={ad.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-950/90 via-purple-950/25 to-transparent" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md sm:text-[10px]">
                  Merchant Partner
                </span>
                <span className="absolute bottom-3 left-3 text-[9px] font-medium uppercase tracking-wider text-white/80 sm:text-[10px]">
                  {BATCH_DETAILS}
                </span>
                <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[9px] font-bold tracking-widest text-white backdrop-blur-md sm:text-[10px]">
                  {padIndex(displayIndex + 1)} / {padIndex(ads.length)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="relative z-20 mt-3 flex items-center justify-between gap-3 pl-2.5 sm:mt-3.5 sm:pl-3">
          <div className="flex items-center gap-1.5">
          {ads.length > 1 &&
            ads.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to advertisement ${idx + 1}`}
                aria-current={idx === displayIndex ? 'true' : undefined}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === displayIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              disabled={ads.length <= 1}
              aria-label="Previous advertisement"
              className="h-7.5 w-7.5 shrink-0 rounded-full border border-white/20 bg-black/40 text-white transition-all hover:bg-black/60 hover:text-white sm:h-8 sm:w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              disabled={ads.length <= 1}
              aria-label="Next advertisement"
              className="h-7.5 w-7.5 shrink-0 rounded-full border border-white/20 bg-black/40 text-white transition-all hover:bg-black/60 hover:text-white sm:h-8 sm:w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
