import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
  const title = ad.title || product?.name
  const description = ad.content || ad.description || product?.description || product?.shortDescription
  const announcementBadge = ad.announcement_message || ad.announcementMessage || 'SPONSORED'
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
      className="relative cursor-pointer overflow-hidden rounded-3xl border-0 shadow-xl"
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
      aria-roledescription={t('buyer.checkout.sponsoredAds.carouselRoleDescription', 'carousel')}
      aria-label={t('buyer.checkout.sponsoredAds.ariaLabel', 'Sponsored advertisements')}
    >
      <CardContent
        className="relative flex h-[250px] max-h-[260px] items-center justify-between overflow-hidden rounded-3xl bg-gradient-to-r from-[#8d4eb3] via-[#7268b3] to-[#5d2d7d] p-6 text-white transition-all duration-700"
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={() => setIsFocused(false)}
      >
        <div className="relative z-10 flex min-w-0 flex-1 flex-col pl-12">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white md:text-xs">
              <Megaphone className="h-3.5 w-3.5" /> {announcementBadge}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm md:text-xs">
              {badgeText}
            </span>
          </div>

          <h3 className="mb-1.5 truncate text-xl font-bold leading-tight tracking-tight text-white md:text-2xl">
            {title}
          </h3>

          {description && (
            <p className="mb-3 text-sm font-normal leading-relaxed text-purple-100/80 md:pr-6 md:text-base">
              {stripHtml(description)}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              size="lg"
              onClick={(event) => {
                event.stopPropagation()
                navigateToAd()
              }}
              className="h-auto gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-100 md:px-4 md:text-sm lg:h-9 lg:px-5"
            >
              Learn more
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="relative z-10 mr-12 h-[232px] w-fit max-w-[49%] overflow-hidden rounded-2xl bg-white">
          {displayImageUrl ? (
            <img
              src={displayImageUrl}
              alt={title}
              className="block h-full w-auto max-w-full object-contain object-center"
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
              className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 text-purple-300/80"
            >
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>

        {ads.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {ads.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                aria-label={t('buyer.checkout.sponsoredAds.goToAdvertisement', `Go to advertisement ${idx + 1}`, { index: idx + 1 })}
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
              className="absolute left-3 top-1/2 z-20 h-9 w-9 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
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
              className="absolute right-3 top-1/2 z-20 h-9 w-9 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
