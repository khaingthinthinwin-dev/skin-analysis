import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useSidebarAds } from '../hooks/useProductDetail';
import { SidebarAdvertisement } from '../services/product.service';

function getImageUrl(url: string | null): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const base = raw.replace(/\/api\/v1\/?$/, '');
  return base + url;
}

interface SidebarAdvertisementsProps {
  idOrSlug: string;
}

const sampleAds = [
  { shop: 'Aura & Essence', title: 'Hydrating Jade Set & Facial Gua Sha', desc: 'Handcrafted natural jade stone set designed to soothe skin and boost serum absorption.', image: '/uploads/products/c86ff43b-9d46-4e63-8609-39cbac709818.png' },
  { shop: 'Glow Essentials', title: 'Summer Glow Collection', desc: 'Discover our bestselling serums and moisturizers — 20% off this week only.', image: '/uploads/products/a6f0a208-63f7-449f-a33b-9f24a3f28810.png' },
  { shop: 'Dermaluxe Lab', title: 'Retinol Night Repair', desc: 'Clinically proven anti-aging serum. Free shipping on orders over $50.', image: '/uploads/products/347496ad-6e35-48f5-97c1-1b8e68545715.png' },
  { shop: 'PureSkin Co.', title: 'Vitamin C Brightening Set', desc: 'Complete 3-step routine for radiant skin. Bundle & save 15%.', image: '/uploads/products/c86ff43b-9d46-4e63-8609-39cbac709818.png' },
  { shop: 'Botanica Beauty', title: 'Organic Rose Mist', desc: 'Hydrating facial toner with real rose petals. Limited batch available.', image: '/uploads/products/a6f0a208-63f7-449f-a33b-9f24a3f28810.png' },
];

export function SidebarAdvertisements({ idOrSlug }: SidebarAdvertisementsProps) {
  const { data: ads = [], isLoading, isError } = useSidebarAds(idOrSlug);
  const [current, setCurrent] = useState(0);
  const pausedRef = useRef(false);

  const total = ads.length > 0 ? ads.length : sampleAds.length;

  useEffect(() => {
    if (total <= 1) {
      pausedRef.current = true;
      return;
    }
    pausedRef.current = false;
    const timer = setInterval(() => {
      if (!pausedRef.current) {
        setCurrent((c) => (c + 1) % total);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [total]);

  const handlePause = () => {
    pausedRef.current = true;
  };
  const handleResume = () => {
    if (total <= 1) return;
    pausedRef.current = false;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  const useFallback = isError || ads.length === 0;
  const sampleAd = sampleAds[current % sampleAds.length];
  const realAd = useFallback ? null : (ads[current % ads.length] as SidebarAdvertisement | undefined);

  const title = useFallback ? sampleAd.title : (realAd?.title ?? '');
  const description = useFallback ? sampleAd.desc : (realAd?.announcementMessage ?? null);
  const imageUrl = useFallback ? sampleAd.image : (realAd?.imageUrl ?? null);
  const linkUrl = useFallback ? '' : (realAd?.linkUrl ?? '');

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
              className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next advertisement"
              onClick={() => setCurrent((c) => (c + 1) % total)}
              className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#e91e63] text-white shadow-sm transition-colors hover:bg-[#c2185b]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        <div className="px-12 py-4">
          <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-[#7c3aed]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#7c3aed]">
            Sponsored
          </span>

          <div className="flex gap-4">
            {imageUrl && (
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white dark:bg-zinc-700">
                <img
                  src={getImageUrl(imageUrl)}
                  alt={title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-snug text-foreground">{title}</p>
              {description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
              )}
              {linkUrl && (
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#7c3aed] hover:underline"
                >
                  Learn more <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {total > 1 && (
          <div className="flex items-center justify-center gap-1.5 pb-3">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to advertisement ${i + 1}`}
                aria-current={i === current ? 'true' : undefined}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? 'w-4 bg-[#7c3aed]' : 'w-1.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
