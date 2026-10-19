import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ChevronLeft, ChevronRight, ImageIcon, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getImageUrl } from '@/lib/image-url'
import { useSponsoredAds } from '@/features/search/hooks/useSponsoredAds'
import { useAdProducts } from '@/features/search/hooks/useAdProducts'

const AUTO_SLIDE_MS = 5000
const SAMPLE_AD_IMAGE = '/uploads/products/cd8048d7-ab84-463f-8851-17bb1659b9ee.png'
const DEFAULT_TAG = 'Natural Skin Care'
const PRODUCTS_PATH = '/buyer/products'
const IMPRESSION_VISIBILITY_THRESHOLD = 0.5

export type AdBannerPlacement =
  | 'search_page_banner'
  | 'recommendation_page_banner'
  | 'productDetail_page_banner'
  | 'checkout_page_banner'

interface AdBannerSliderProps {
  placement: AdBannerPlacement
  fallbackProductId?: string
  onImpression?: (adIds: string[]) => void
  onAdClick?: (adId: string) => void
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '')

function usePrefersReducedMotion() {
  const [reduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  return reduced
}

export function AdBannerSlider({
  placement,
  fallbackProductId,
  onImpression,
  onAdClick,
}: AdBannerSliderProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data } = useSponsoredAds(placement)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [failedImages, setFailedImages] = useState<string[]>([])
  const reducedMotion = usePrefersReducedMotion()
  const [now, setNow] = useState(() => Date.now())
  const panelRef = useRef<HTMLDivElement | null>(null)
  const impressedAdsRef = useRef('')
  const onImpressionRef = useRef(onImpression)

  useEffect(() => {
    if (reducedMotion) return

    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [reducedMotion])

  const ads = (data?.data ?? []).filter((ad) => {
    const startsAt = ad.startsAt ? Date.parse(ad.startsAt) : Number.NaN
    const expiresAt = ad.expiresAt ? Date.parse(ad.expiresAt) : Number.NaN

    return (
      ad.placement === placement &&
      ad.approvalStatus === 'approved' &&
      Number.isFinite(startsAt) &&
      Number.isFinite(expiresAt) &&
      startsAt <= now &&
      now <= expiresAt
    )
  })

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

  const impressionKey = ads.map((ad) => ad.id).join('|')

  useEffect(() => {
    onImpressionRef.current = onImpression
  }, [onImpression])

  useEffect(() => {
    const node = panelRef.current
    const reportImpression = onImpressionRef.current
    if (!node || !reportImpression || !impressionKey) return
    if (typeof IntersectionObserver === 'undefined') return

    const adIds = impressionKey.split('|')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (impressedAdsRef.current === impressionKey) return
          impressedAdsRef.current = impressionKey
          reportImpression(adIds)
        }
      },
      { threshold: IMPRESSION_VISIBILITY_THRESHOLD },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [impressionKey])

  if (!ads.length) return null

  const ad = ads[displayIndex]
  const sku = ad.sku?.trim() || undefined
  const product = sku ? adProducts?.[sku] : undefined
  const title = ad.title || product?.name
  const description = ad.content || ad.description || product?.description || product?.shortDescription
  const announcementBadge = ad.announcement_message || ad.announcementMessage || 'SPONSORED'
  const badgeText = product?.merchant?.shopName || product?.category?.name || DEFAULT_TAG
  const imageCandidates = [ad.imageUrl, product?.images?.[0], SAMPLE_AD_IMAGE]
    .filter((source): source is string => Boolean(source))
    .map((source) => getImageUrl(source))
    .filter((source) => !failedImages.includes(source))
  const displayImageUrl = imageCandidates[0]

  const getDestination = () => {
    if (sku) return `/buyer/products/${encodeURIComponent(sku)}`
    if (fallbackProductId) return `/buyer/products/${encodeURIComponent(fallbackProductId)}`
    return ad.target_url ?? ad.linkUrl ?? PRODUCTS_PATH
  }

  const navigateToAd = () => {
    onAdClick?.(ad.id)
    const destination = getDestination()

    if (/^https?:\/\//i.test(destination)) {
      window.location.assign(destination)
    } else {
      navigate(destination)
    }
  }

  return (
    <Card
      ref={panelRef}
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
        className="relative flex h-auto min-h-[340px] max-h-none flex-col items-stretch justify-start gap-3 overflow-hidden rounded-3xl bg-gradient-to-r from-[#8d4eb3] via-[#7268b3] to-[#5d2d7d] p-4 text-white transition-all duration-700 sm:p-5 md:h-[250px] md:min-h-0 md:max-h-[260px] md:flex-row md:items-center md:justify-between md:gap-0 md:p-6"
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={() => setIsFocused(false)}
      >
        <div className="relative z-10 flex w-full min-w-0 flex-none flex-col px-0 md:flex-1 md:pl-12">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white md:text-xs">
              <Megaphone className="h-3.5 w-3.5" /> {announcementBadge}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm md:text-xs">
              {badgeText}
            </span>
          </div>

          <h3 className="mb-1.5 line-clamp-2 break-words text-xl font-bold leading-tight tracking-tight text-white md:truncate md:text-2xl">
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

        <div className="relative z-10 mr-0 h-auto min-h-44 w-full max-w-full shrink-0 overflow-hidden rounded-2xl bg-white sm:min-h-48 md:mr-12 md:h-[232px] md:min-h-0 md:w-fit md:max-w-[49%]">
          {displayImageUrl ? (
            <img
              src={displayImageUrl}
              alt={title}
              className="block h-auto w-full max-w-full object-contain object-center md:h-full md:w-auto"
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
              className="absolute left-3 top-[70%] z-20 h-9 w-9 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white md:top-1/2"
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
              className="absolute right-3 top-[70%] z-20 h-9 w-9 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white md:top-1/2"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
