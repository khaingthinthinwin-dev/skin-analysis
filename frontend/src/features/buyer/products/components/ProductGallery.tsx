import { useState } from 'react';
import { cn } from '@/lib/utils';

function getImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const base = raw.replace(/\/api\/v1\/?$/, '');
  return base + url;
}

interface ProductGalleryProps {
  images: string[];
  name: string;
}

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const shown = images.length > 0 ? images : ['/placeholder-product.png'];

  return (
    <div className="space-y-3">
      <div className="aspect-square w-full overflow-hidden rounded-xl border bg-muted">
        <img
          src={getImageUrl(shown[selected])}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover object-center transition-transform duration-200 hover:scale-105"
        />
      </div>
      {shown.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {shown.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              className={cn(
                'h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                i === selected
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50',
              )}
            >
              <img
                src={getImageUrl(img)}
                alt={`${name} view ${i + 1}`}
                className="h-full w-full object-cover object-center"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
