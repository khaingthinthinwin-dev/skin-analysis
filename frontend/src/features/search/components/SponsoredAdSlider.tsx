import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, ImageIcon, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getImageUrl } from '@/lib/image-url'
import type { SponsoredAd } from '@/types/search.types'
import { useSponsoredAds } from '../hooks/useSponsoredAds'
import { useAdProducts } from '../hooks/useAdProducts'

const AUTO_SLIDE_MS = 5000
const SEARCH_PAGE_PLACEMENT = 'search_page_banner'
const SAMPLE_AD_IMAGE = '/uploads/products/cd8048d7-ab84-463f-8851-17bb1659b9ee.png'
const DEFAULT_TAG = 'Natural Skin Care'
const PRODUCTS_PATH = '/buyer/products'

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '')

const FALLBACK_ADS: SponsoredAd[] = [
  {
    id: 'fallback-ad-dmc-004',
    placement: SEARCH_PAGE_PLACEMENT,
    title: 'Daily Moisture Cream',
    description: 'A lightweight moisturizer that keeps skin soft and hydrated all day.',
    content: null,
    imageUrl: null,
    sku: 'DMC-004',
    tier: 'standard',
    approvalStatus: 'approved',
    startsAt: null,
    expiresAt: null,
  },
  {
    id: 'fallback-ad-vcs-003',
    placement: SEARCH_PAGE_PLACEMENT,
    title: 'Vitamin C Brightening Serum',
    description: 'A potent vitamin C serum that brightens skin and reduces dark spots.',
    content: null,
    imageUrl: null,
    sku: 'VCS-003',
    tier: 'premium',
    approvalStatus: 'approved',
    startsAt: null,
    expiresAt: null,
  },
  {
    id: 'fallback-ad-mss-011',
    placement: SEARCH_PAGE_PLACEMENT,
    title: 'Mineral Sunscreen Stick',
    description: 'A convenient mineral sunscreen stick for easy on-the-go UV protection.',
    content: null,
    imageUrl: null,
    sku: 'MSS-011',
    tier: 'basic',
    approvalStatus: 'approved',
    startsAt: null,
    expiresAt: null,
  },
]

interface SponsoredAdSliderProps {
  fallbackProductId?: string
}

function usePrefersReducedMotion() {
  const [reduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  return reduced
}

export function SponsoredAdSlider({ fallbackProductId }: SponsoredAdSliderProps) {
  const navigate = useNavigate()
  const { data, isPending, isError } = useSponsoredAds(SEARCH_PAGE_PLACEMENT)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [failedImages, setFailedImages] = useState<string[]>([])
  const reducedMotion = usePrefersReducedMotion()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (reducedMotion) return

    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [reducedMotion])

  const activeAds = (data?.data ?? []).filter((ad) => {
    const startsAt = ad.startsAt ? Date.parse(ad.startsAt) : Number.NaN
    const expiresAt = ad.expiresAt ? Date.parse(ad.expiresAt) : Number.NaN

    return (
      ad.placement === SEARCH_PAGE_PLACEMENT &&
      ad.approvalStatus === 'approved' &&
      Number.isFinite(startsAt) &&
      Number.isFinite(expiresAt) &&
      startsAt <= now &&
      now <= expiresAt
    )
  })

  const ads = activeAds.length > 0 ? activeAds : !isPending && !isError ? FALLBACK_ADS : []
  const { data: adProducts } = useAdProducts(ads.map((ad) => ad.sku))

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
  const sku = ad.sku?.trim() || undefined
  const product = sku ? adProducts?.[sku] : undefined
  const title = product?.name || ad.title
  const description = product?.description || product?.shortDescription || ad.content || ad.description
  const badgeText = product?.merchant?.shopName || product?.category?.name || DEFAULT_TAG
  const imageCandidates = [product?.images?.[0], ad.imageUrl, SAMPLE_AD_IMAGE]
    .filter((source): source is string => Boolean(source))
    .map((source) => getImageUrl(source))
    .filter((source) => Boolean(source) && !failedImages.includes(source))
  const displayImageUrl = imageCandidates[0]

  const getDestination = () => {
    if (sku) return `/buyer/products/${encodeURIComponent(sku)}`
    if (fallbackProductId) return `/buyer/products/${encodeURIComponent(fallbackProductId)}`
    return ad.target_url ?? ad.linkUrl ?? PRODUCTS_PATH
  }

  const navigateToAd = () => {
    const destination = getDestination()

    if (/^https?:\/\//i.test(destination)) {
      window.location.assign(destination)
    } else {
      navigate(destination)
    }
  }

  return (
    <Card
      className="relative cursor-pointer overflow-hidden rounded-[1.75rem] border-0 shadow-xl"
      onClick={navigateToAd}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          navigateToAd()
        }
      }}
      role="link"
      tabIndex={0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-roledescription="carousel"
      aria-label="Sponsored advertisements"
    >
      <CardContent
        className="relative min-h-[15rem] bg-gradient-to-r from-[#78349a] via-[#5c5a9f] to-[#562779] px-6 py-6 text-white transition-all duration-700 sm:min-h-[15.5rem] sm:px-16 sm:py-6"
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={() => setIsFocused(false)}
      >
        <div className="relative z-10 grid items-center gap-5 sm:grid-cols-12 sm:gap-5 lg:gap-6">
          <div className="flex min-w-0 flex-col gap-3 sm:col-span-7 sm:gap-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">
                <Megaphone className="h-3.5 w-3.5" /> {ad?.announcement_message || ad?.announcementMessage || "SPONSORED"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm sm:text-xs">
                {badgeText}
              </span>
              </div>

<h3 className="truncate text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl lg:text-[1.625rem]">
              {title}
            </h3>

            {description && (
              <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                {stripHtml(description)}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2.5 pt-1 sm:gap-3">
              <Button
                size="lg"
                onClick={(event) => {
                  event.stopPropagation()
                  navigateToAd()
                }}
                className="h-12 gap-4 rounded-md bg-[#f8f7f5] px-8 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-white sm:text-base"
              >
                Learn more
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-center sm:col-span-5 sm:justify-end">
            <div className="aspect-[1.74] w-full max-w-[22rem] overflow-hidden rounded-2xl border-4 border-white/90 bg-[#fffaf5] shadow-2xl">
              {displayImageUrl ? (
                <img
                  src={displayImageUrl}
                  alt={title}
                  className="h-full w-full object-cover"
                  onError={() =>
                    setFailedImages((prev) =>
                      prev.includes(displayImageUrl) ? prev : [...prev, displayImageUrl],
                    )
                  }
                />
              ) : (
                <div
                  role="img"
                  aria-label={`${title} image unavailable`}
                  className="flex h-full w-full items-center justify-center text-purple-300/70"
                >
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
            </div>
          </div>
        </div>

        {ads.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {ads.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Go to advertisement ${idx + 1}`}
                aria-current={idx === displayIndex ? 'true' : undefined}
                onClick={(event) => {
                  event.stopPropagation()
                  setCurrentIndex(idx)
                }}
                className={`h-2 rounded-full transition-all duration-300 ${idx === displayIndex ? 'w-8 bg-white' : 'w-2 bg-white/45 hover:bg-white/75'}`}
              />
            ))}
          </div>
        )}

        {ads.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation()
                prev()
              }}
              aria-label="Previous advertisement"
              className="absolute left-3 top-1/2 z-20 h-9 w-9 -translate-y-1/2 rounded-full border border-white/15 bg-black/25 text-white shadow-sm transition-colors hover:bg-black/40 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation()
                next()
              }}
              aria-label="Next advertisement"
              className="absolute right-3 top-1/2 z-20 h-9 w-9 -translate-y-1/2 rounded-full border border-white/15 bg-black/25 text-white shadow-sm transition-colors hover:bg-black/40 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
