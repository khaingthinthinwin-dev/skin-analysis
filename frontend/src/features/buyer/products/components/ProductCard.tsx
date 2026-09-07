import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router';
import { SimilarProduct } from '../services/product.service';
import { StarRating } from './StarRating';

interface ProductCardProps {
  product: SimilarProduct;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US').format(price);
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link to={`/buyer/products/${product.slug}`} className="group block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="aspect-square w-full overflow-hidden bg-muted">
          <img
            src={product.images[0] ?? '/placeholder-product.png'}
            alt={product.name}
            className="h-full w-full object-cover object-center transition-transform group-hover:scale-105"
          />
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
