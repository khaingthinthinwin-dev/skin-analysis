import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router';
import { SimilarProduct } from '../services/product.service';
import { StarRating } from './StarRating';
import { ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function getImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const base = raw.replace(/\/api\/v1\/?$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

interface ProductCardProps {
  product: SimilarProduct;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US').format(price);
}

export function ProductCard({ product }: ProductCardProps) {
  const { isAuthenticated } = useAuth();
  const imageUrl = getImageUrl(product.images[0]);
  const productLink = isAuthenticated ? `/buyer/products/${product.slug}` : `/products/${product.slug}`;

  return (
    <Link to={productLink} className="group block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="aspect-square w-full overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover object-center transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <h3 className="font-medium group-hover:underline">{product.name}</h3>
          <div className="flex items-center gap-2">
            <StarRating rating={product.avgRating} size="sm" />
            <span className="text-sm text-muted-foreground">({product.reviewCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">{formatPrice(product.price)} MMK</span>
            {product.compareAtPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)} MMK
              </span>
            )}
          </div>
          {product.isFeatured && <Badge variant="secondary">Featured</Badge>}
        </div>
      </Card>
    </Link>
  );
}
