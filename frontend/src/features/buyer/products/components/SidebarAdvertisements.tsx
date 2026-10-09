import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { useSidebarAds } from '../hooks/useProductDetail';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

function getImageUrl(url: string | null): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const base = raw.replace(/\/api\/v1\/?$/, '');
  return base + url;
}

const PRODUCT_DETAIL_AD_PLACEMENT = 'productDetail_page_banner';
const AUTO_SLIDE_MS = 5000;

function isSidebarAdInSchedule(ad: {
  startsAt?: string | Date | null;
  expiresAt?: string | Date | null;
}): boolean {
  const now = Date.now();
  const parseDate = (value: string | Date | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    const time = value instanceof Date ? value.getTime() : Date.parse(value);
    return Number.isNaN(time) ? null : time;
  };
  // Date condition: startsAt <= now < expiresAt. Missing bound = no bound.
  // Invalid bound = not eligible (fail safe, hide the ad).
  if (ad.startsAt !== null && ad.startsAt !== undefined) {
    const start = parseDate(ad.startsAt);
    if (start === null || start > now) return false;
  }
  if (ad.expiresAt !== null && ad.expiresAt !== undefined) {
    const end = parseDate(ad.expiresAt);
    if (end === null || end <= now) return false;
  }
  return true;
}

interface SidebarAdvertisementsProps {
  idOrSlug: string;
}

export function SidebarAdvertisements({ idOrSlug }: SidebarAdvertisementsProps) {
  const { t } = useTranslation();
  const { data: ads = [], isLoading, isError } = useSidebarAds(idOrSlug);
  const { isAuthenticated } = useAuth();
  const basePath = isAuthenticated ? '/buyer/products' : '/products';
  const fallbackPath = `${basePath}/${idOrSlug}`;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // Placement + date condition (productDetail_page_banner, startsAt <= now < expiresAt).
  // Backend getSidebarAds() already filters the same way; this guards legacy/stale payloads.
  const eligibleAds = ads.filter((ad) => {
    if (ad.placement && ad.placement !== PRODUCT_DETAIL_AD_PLACEMENT) return false;
    return isSidebarAdInSchedule(ad);
  });

  const total = eligibleAds.length;

  // Auto-rotate every 5s. Hover pauses; leaving the hover restarts a full
  // 5s countdown. Rotation state is never paused by focus, so returning to
  // this page always resumes rotating.
  useEffect(() => {
    if (total <= 1 || paused) return;
    const timer = setTimeout(() => {
      setCurrent((c) => (c + 1) % total);
    }, AUTO_SLIDE_MS);
    return () => clearTimeout(timer);
  }, [total, paused, current]);

  const handlePause = () => setPaused(true);
  const handleResume = () => {
    if (total <= 1) return;
    setPaused(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-64 sm:h-72 w-full rounded-3xl" />
      </div>
    );
  }

  // No eligible (unexpired) ad → hide the section entirely.
  if (isError || total === 0) return null;

  const activeIndex = current % total;
  const ad = eligibleAds[activeIndex];
  const title = ad.title;
  const announcement = ad.announcementMessage;
  const content = ad.description;
  const imageUrl = ad.imageUrl ?? null;
  // Learn more → the product resolved from the ad's sku (falls back to the ad
  // image, then to this product).
  const adProduct = ad.productSlug ?? ad.productId;
  const productPath = adProduct ? `${basePath}/${adProduct}` : fallbackPath;

  return (
    <div
      className="relative"
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
    >
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/50">
        <div className="relative px-11 sm:px-14 md:px-16 py-6 md:py-8 bg-gradient-to-r from-purple-900/90 via-indigo-900/80 to-purple-950/90 text-white transition-all duration-700">
          <div className="relative z-10 grid gap-5 md:grid-cols-12 md:items-center">
            <div className="space-y-3 md:col-span-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs uppercase tracking-wider font-semibold py-1 px-3 max-w-full"
                  title={announcement || t('buyer.checkout.sponsoredAds.sponsoredBadge', 'Sponsored')}
                >
                  <Megaphone className="w-3.5 h-3.5 mr-1 inline shrink-0" />
                  <span className="truncate">
                    {announcement || t('buyer.checkout.sponsoredAds.sponsoredBadge', 'Sponsored')}
                  </span>
                </Badge>
                {ad.shopName && (
                  <Badge className="bg-accent text-white font-bold text-xs py-1 px-3">
                    {ad.shopName}
                  </Badge>
                )}
              </div>

              <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-white leading-tight">
                {title}
              </h2>

              {content && (
                <p className="text-sm sm:text-base text-zinc-200/90 max-w-xl line-clamp-2">
                  {content}
                </p>
              )}

              <div className="pt-2">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-zinc-900 hover:bg-zinc-100 font-bold shadow-lg"
                >
                  <Link to={productPath}>
                    {t('buyer.checkout.sponsoredAds.learnMore', 'Learn more')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex md:col-span-4 justify-center items-center">
              {imageUrl ? (
                <div className="relative w-full max-w-sm h-32 sm:h-36 md:h-40 lg:h-48 rounded-2xl overflow-hidden border border-white/20 shadow-inner">
                  <img
                    src={getImageUrl(imageUrl)}
                    alt={title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  
                </div>
              ) : (
                <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center p-4 text-center shadow-inner">
                  <Megaphone className="w-10 h-10 text-white/80 mb-2" />
                  <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                    {t('buyer.products.ads.merchantPartner', 'Merchant Partner')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {total > 1 && (
            <>
              <div className="absolute left-2 sm:left-3 top-1/2 z-20 -translate-y-1/2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t(
                    'buyer.checkout.sponsoredAds.previousAdvertisement',
                    'Previous advertisement',
                  )}
                  onClick={() => setCurrent((c) => (c - 1 + total) % total)}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/20 shadow-md"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
              <div className="absolute right-2 sm:right-3 top-1/2 z-20 -translate-y-1/2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t(
                    'buyer.checkout.sponsoredAds.nextAdvertisement',
                    'Next advertisement',
                  )}
                  onClick={() => setCurrent((c) => (c + 1) % total)}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/20 shadow-md"
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>

              <div className="absolute left-1/2 bottom-2 sm:bottom-3 z-20 -translate-x-1/2 flex items-center gap-2">
                {Array.from({ length: total }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={t(
                      'buyer.checkout.sponsoredAds.goToAdvertisement',
                      'Go to advertisement {{index}}',
                      { index: i + 1 },
                    )}
                    aria-current={i === current ? 'true' : undefined}
                    onClick={() => setCurrent(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === current ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
