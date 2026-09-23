import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'

function getImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
  const base = raw.replace(/\/api\/v1\/?$/, '')
  return base + url
}

const sampleAds = [
  { shop: 'Aura & Essence', title: 'Hydrating Jade Set & Facial Gua Sha', desc: 'Handcrafted natural jade stone set designed to soothe skin and boost serum absorption.', image: '/uploads/products/c86ff43b-9d46-4e63-8609-39cbac709818.png', link: '#' },
  { shop: 'Glow Essentials', title: 'Summer Glow Collection', desc: 'Discover our bestselling serums and moisturizers — 20% off this week only.', image: '/uploads/products/a6f0a208-63f7-449f-a33b-9f24a3f28810.png', link: '#' },
  { shop: 'Dermaluxe Lab', title: 'Retinol Night Repair', desc: 'Clinically proven anti-aging serum. Free shipping on orders over $50.', image: '/uploads/products/347496ad-6e35-48f5-97c1-1b8e68545715.png', link: '#' },
  { shop: 'PureSkin Co.', title: 'Vitamin C Brightening Set', desc: 'Complete 3-step routine for radiant skin. Bundle & save 15%.', image: '/uploads/products/c86ff43b-9d46-4e63-8609-39cbac709818.png', link: '#' },
  { shop: 'Botanica Beauty', title: 'Organic Rose Mist', desc: 'Hydrating facial toner with real rose petals. Limited batch available.', image: '/uploads/products/a6f0a208-63f7-449f-a33b-9f24a3f28810.png', link: '#' },
]

export function SampleAdBanner() {
  const [current, setCurrent] = useState(0)
  const pausedRef = useRef(false)
  const total = sampleAds.length

  useEffect(() => {
    if (total <= 1) {
      pausedRef.current = true
      return
    }
    pausedRef.current = false
    const timer = setInterval(() => {
      if (!pausedRef.current) {
        setCurrent((c) => (c + 1) % total)
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [total])

  const handlePause = () => { pausedRef.current = true }
  const handleResume = () => {
    if (total <= 1) return
    pausedRef.current = false
  }

  const ad = sampleAds[current % sampleAds.length]

  return (
    <div
      className="relative"
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onFocus={handlePause}
      onBlur={handleResume}
    >
      <div className="relative overflow-hidden rounded-xl bg-[#f3f0ff] dark:bg-zinc-800">
        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous advertisement"
              onClick={() => setCurrent((c) => (c - 1 + total) % total)}
              className="absolute left-1 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#7c3aed] text-white shadow-sm transition-colors hover:bg-[#6d28d9] sm:left-2 sm:h-7 sm:w-7"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <button
              type="button"
              aria-label="Next advertisement"
              onClick={() => setCurrent((c) => (c + 1) % total)}
              className="absolute right-1 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#7c3aed] text-white shadow-sm transition-colors hover:bg-[#6d28d9] sm:right-2 sm:h-7 sm:w-7"
            >
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </>
        )}

        <div className="px-9 pb-3 pt-3 sm:px-12 sm:py-4">
          <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#7c3aed]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#7c3aed] sm:mb-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
            Sponsored
          </span>

          <div className="flex items-start gap-2 sm:gap-4">
            {ad.image && (
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white dark:bg-zinc-700 sm:h-20 sm:w-20">
                <img
                  src={getImageUrl(ad.image)}
                  alt={ad.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-snug text-foreground sm:text-sm">{ad.title}</p>
              {ad.desc && (
                <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">{ad.desc}</p>
              )}
              {ad.link && (
                <a
                  href={ad.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-[#7c3aed] hover:underline sm:mt-2 sm:text-xs"
                >
                  Learn more <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {total > 1 && (
          <div className="flex items-center justify-center gap-1 pb-2 sm:gap-1.5 sm:pb-3">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to advertisement ${i + 1}`}
                aria-current={i === current ? 'true' : undefined}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? 'w-3 sm:w-4 bg-[#7c3aed]' : 'w-1.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
