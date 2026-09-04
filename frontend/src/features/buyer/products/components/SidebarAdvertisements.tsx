import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSidebarAds } from '../hooks/useProductDetail';
import { SidebarAdvertisement } from '../services/product.service';

interface SidebarAdvertisementsProps {
  idOrSlug: string;
}

export function SidebarAdvertisements({ idOrSlug }: SidebarAdvertisementsProps) {
  const { data: ads = [], isLoading, isError } = useSidebarAds(idOrSlug);
  const [current, setCurrent] = useState(0);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);

  const total = ads.length > 0 ? ads.length : 5;

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
    setPaused(true);
  };
  const handleResume = () => {
    if (total <= 1) return;
    pausedRef.current = false;
    setPaused(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (isError || ads.length === 0) {
    const sampleAds = [
      { shop: 'Glow Essentials', title: 'Summer Glow Collection', desc: 'Discover our bestselling serums and moisturizers — 20% off this week only.' },
      { shop: 'Dermaluxe Lab', title: 'Retinol Night Repair', desc: 'Clinically proven anti-aging serum. Free shipping on orders over $50.' },
      { shop: 'PureSkin Co.', title: 'Vitamin C Brightening Set', desc: 'Complete 3-step routine for radiant skin. Bundle & save 15%.' },
      { shop: 'Botanica Beauty', title: 'Organic Rose Mist', desc: 'Hydrating facial toner with real rose petals. Limited batch available.' },
      { shop: 'AquaDerma', title: 'Hyaluronic Acid Boost', desc: 'Deep hydration for dry skin. Dermatologist recommended. Try it today.' },
    ];
    const ad = sampleAds[current];

    return (
      <div
        className="relative"
        onMouseEnter={handlePause}
        onMouseLeave={handleResume}
        onFocus={handlePause}
        onBlur={handleResume}
      >
        <Badge variant="secondary" className="mb-2">
          Sponsored
        </Badge>
        <Card className="overflow-hidden">
          <div className="h-36 w-full bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 dark:from-purple-950/40 dark:via-pink-950/30 dark:to-amber-950/30 flex items-center justify-center">
            <div className="text-center px-4">
              <p className="text-sm font-bold text-foreground">{ad.shop}</p>
              <p className="text-xs text-muted-foreground mt-1">Premium skincare for radiant skin</p>
            </div>
          </div>
          <div className="p-3">
            <p className="font-medium">{ad.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{ad.desc}</p>
          </div>
        </Card>
        <p className="text-xs text-muted-foreground">
          Sponsored · {ad.shop}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous advertisement"
            onClick={() => setCurrent((c) => (c - 1 + sampleAds.length) % sampleAds.length)}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1">
            {sampleAds.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === current ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next advertisement"
            onClick={() => setCurrent((c) => (c + 1) % sampleAds.length)}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          {paused ? 'Paused' : 'Auto-rotating'} · {current + 1}/{sampleAds.length}
        </p>
      </div>
    );
  }

  const ad: SidebarAdvertisement = ads[current];

  return (
    <div
      className="relative"
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onFocus={handlePause}
      onBlur={handleResume}
    >
      <Badge variant="secondary" className="mb-2">
        Sponsored
      </Badge>
      {ad.linkUrl ? (
        <a
          href={ad.linkUrl}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          className="block"
        >
          <Card className="overflow-hidden">
            {ad.imageUrl && (
              <div className="h-36 w-full bg-muted">
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="p-3">
              <p className="font-medium">{ad.title}</p>
              {ad.announcementMessage && (
                <p className="mt-1 text-sm text-muted-foreground">{ad.announcementMessage}</p>
              )}
            </div>
          </Card>
        </a>
      ) : (
        <Card className="overflow-hidden">
          {ad.imageUrl && (
            <div className="h-36 w-full bg-muted">
              <img
                src={ad.imageUrl}
                alt={ad.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="p-3">
            <p className="font-medium">{ad.title}</p>
            {ad.announcementMessage && (
              <p className="mt-1 text-sm text-muted-foreground">{ad.announcementMessage}</p>
            )}
          </div>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">
        Sponsored · {ad.shopName}
        {ad.shopSlug && (
          <a href={`/shops/${ad.shopSlug}`} className="ml-1 text-blue-600 hover:underline">
            Visit shop
          </a>
        )}
      </p>

      {total > 1 && (
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous advertisement"
            onClick={() => setCurrent((c) => (c - 1 + total) % total)}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1">
            {ads.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === current ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next advertisement"
            onClick={() => setCurrent((c) => (c + 1) % total)}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {total > 1 && (
        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          {paused ? 'Paused' : 'Auto-rotating'} · {current + 1}/{total}
        </p>
      )}
    </div>
  );
}
