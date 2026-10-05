import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, ImageIcon, Megaphone, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getImageUrl } from '@/lib/image-url'
import { useSponsoredAds } from '../hooks/useSponsoredAds'

const AUTO_SLIDE_MS = 5000
const SAMPLE_AD_IMAGE = '/uploads/products/cd8048d7-ab84-463f-8851-17bb1659b9ee.png'

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
  const { data } = useSponsoredAds('search_page_banner')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)
  const reducedMotion = usePrefersReducedMotion()
  const [now, setNow] = useState(() => Date.now())

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
      ad.placement === 'search_page_banner' &&
      ad.approvalStatus === 'approved' &&
      Number.isFinite(startsAt) &&
      Number.isFinite(expiresAt) &&
      startsAt <= now &&
      now <= expiresAt
    )
  })
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
  const targetId = ad.product_id || ad.productId || ad.product?.id
  const detailProductId =
    ad.productSlug || targetId || ad.target_id || fallbackProductId
  const productPath = detailProductId ? `/buyer/products/${detailProductId}` : null
  const imageUrl = getImageUrl(ad.image_url ?? ad.imageUrl)
  const fallbackImageUrl = getImageUrl(SAMPLE_AD_IMAGE)
  const displayImageUrl = imageUrl && failedImageUrl !== imageUrl ? imageUrl : fallbackImageUrl
  const navigateToAd = () => {
    const destination = productPath || ad.target_url || ad.linkUrl || '/buyer/products'

    if (/^https?:\/\//i.test(destination)) {
      window.location.assign(destination)
    } else {
      navigate(destination)
    }
  }

  return (
    <Card
      className="relative cursor-pointer overflow-hidden rounded-2xl border border-purple-300/20 bg-gradient-to-r from-[#702e98] via-[#58478f] to-[#4b1c70] text-white shadow-[0_16px_36px_rgba(66,22,91,0.25)]"
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
        className="relative px-12 py-5 md:px-14"
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={() => setIsFocused(false)}
      >
        <div className="grid min-h-[200px] grid-cols-12 items-center gap-5 pb-8 md:gap-6">
          <div className="col-span-12 min-w-0 space-y-3 md:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                <Megaphone className="h-3 w-3" /> Sponsored
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-purple-100">
                <Sparkles className="h-3 w-3" /> {ad.tier} promotion
              </span>
            </div>

            <h3 className="max-w-[560px] text-xl font-bold leading-tight tracking-tight text-white md:text-2xl">
              {ad.title}
            </h3>

            {ad.description && (
              <p className="max-w-[520px] text-sm leading-relaxed text-purple-100/85">
                {ad.description}
              </p>
            )}

            <div className="flex flex-wrap items-center pt-1">
              <Button
                size="sm"
                onClick={(event) => {
                  event.stopPropagation()
                  const targetUrl = ad.target_url ?? ad.linkUrl
                  if (detailProductId) {
                    navigate(`/buyer/products/${detailProductId}`)
                  } else if (targetUrl) {
                    if (/^https?:\/\//i.test(targetUrl)) {
                      window.location.assign(targetUrl)
                    } else {
                      navigate(targetUrl)
                    }
                  } else {
                    navigate('/buyer/products')
                  }
                }}
                className="h-9 gap-2 rounded-full bg-white px-4 text-xs font-bold uppercase tracking-wide text-gray-900 shadow-sm hover:bg-purple-50"
              >
                <span>Learn more</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="col-span-12 flex justify-center md:col-span-5 md:justify-end">
            <div className="relative h-[168px] w-full max-w-[310px] overflow-hidden rounded-2xl border border-white/25 bg-[#f6eef8] shadow-xl">
              {displayImageUrl && failedImageUrl !== displayImageUrl ? (
                <img
                  src={displayImageUrl}
                  alt={ad.title}
                  className="h-full w-full object-cover"
                  onError={() => setFailedImageUrl(displayImageUrl)}
                />
              ) : (
                <div
                  role="img"
                  aria-label={`${ad.title} image unavailable`}
                  className="flex h-full w-full items-center justify-center text-white/50"
                >
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              <span className="absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
                Merchant partner
              </span>
              {ads.length > 1 && (
                <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white">
                  {String(displayIndex + 1).padStart(2, '0')} / {String(ads.length).padStart(2, '0')}
                </span>
              )}
            </div>
          </div>
        </div>

        {ads.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center gap-2">
            {ads.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to advertisement ${idx + 1}`}
                aria-current={idx === displayIndex ? 'true' : undefined}
                onClick={(event) => { event.stopPropagation(); setCurrentIndex(idx) }}
                className={`h-2 rounded-full transition-all ${idx === displayIndex ? 'w-5 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>
        )}

        {ads.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => { event.stopPropagation(); prev() }}
              disabled={ads.length <= 1}
              aria-label="Previous advertisement"
              className="absolute left-3 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/35 p-0 text-white transition-colors hover:bg-black/60 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => { event.stopPropagation(); next() }}
              disabled={ads.length <= 1}
              aria-label="Next advertisement"
              className="absolute right-3 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/35 p-0 text-white transition-colors hover:bg-black/60 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
