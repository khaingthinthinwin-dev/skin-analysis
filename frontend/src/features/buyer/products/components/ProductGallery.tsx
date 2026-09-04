import { useState } from 'react';

interface ProductGalleryProps {
  images: string[];
  name: string;
}

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const shown = images.length > 0 ? images : ['/placeholder-product.png'];

  return (
    <div className="space-y-4">
      <div className="aspect-square w-full overflow-hidden rounded-xl border bg-muted">
        <img
          src={shown[selected]}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover object-center"
        />
      </div>
      {shown.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {shown.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              className={`h-20 w-20 shrink-0 rounded-md border-2 object-cover ${
                i === selected ? 'border-primary' : 'border-transparent'
              }`}
            >
              <img
                src={img}
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
