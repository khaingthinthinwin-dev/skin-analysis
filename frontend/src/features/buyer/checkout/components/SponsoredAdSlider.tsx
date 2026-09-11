import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkoutService } from '../services/checkout.service';
import type { SponsoredAd } from '@/types/checkout.types';

interface SponsoredAdSliderProps {
  ads: SponsoredAd[];
}

export function SponsoredAdSlider({ ads }: SponsoredAdSliderProps) {
  const [current, setCurrent] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const next = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrent((prev) => (prev + 1) % ads.length);
      setIsAnimating(false);
    }, 300);
  }, [ads.length]);

  const prev = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrent((prev) => (prev - 1 + ads.length) % ads.length);
      setIsAnimating(false);
    }, 300);
  }, [ads.length]);

  useEffect(() => {
    if (ads.length <= 1 || dismissed) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [ads.length, next, dismissed]);

  if (!ads.length || dismissed) return null;

  const ad = ads[current];

  const handleClick = async () => {
    try {
      await checkoutService.trackAdClick(ad.id);
    } catch {
      // silent
    }
    if (ad.ctaUrl) {
      window.open(ad.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 shadow-sm"
      style={{
        animation: 'slideDown 0.4s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-16px);
            max-height: 0;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            max-height: 200px;
          }
        }
      `}</style>

      <div className="relative flex items-center gap-3 p-3 sm:p-4">
        {/* Sponsored label */}
        <div className="absolute left-0 top-0 rounded-br-md rounded-tl-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
          Sponsored
        </div>

        {/* Dismiss button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss ad"
        >
          <X className="h-3 w-3" />
        </Button>

        {/* Previous button */}
        {ads.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={prev}
            aria-label="Previous ad"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Ad content */}
        <div
          className={`flex flex-1 min-w-0 items-center gap-4 transition-all duration-300 ${
            isAnimating ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'
          }`}
        >
          {ad.imageUrl && (
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="h-14 w-auto shrink-0 rounded object-contain sm:h-16"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {ad.title}
            </p>
            {ad.description && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {ad.description}
              </p>
            )}
            {ad.ctaText && (
              <button
                onClick={handleClick}
                className="mt-1 text-xs font-bold text-primary underline-offset-2 hover:underline"
              >
                {ad.ctaText} →
              </button>
            )}
          </div>
        </div>

        {/* Next button */}
        {ads.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={next}
            aria-label="Next ad"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Dot indicators */}
        {ads.length > 1 && (
          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1.5">
            {ads.map((_, i) => (
              <span
                key={i}
                className={`block rounded-full transition-all duration-300 ${
                  i === current
                    ? 'h-1.5 w-4 bg-primary'
                    : 'h-1.5 w-1.5 bg-primary/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
