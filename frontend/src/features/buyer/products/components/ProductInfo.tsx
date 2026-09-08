import { Badge } from '@/components/ui/badge';
import { ProductDetail } from '../services/product.service';
import { StarRating } from './StarRating';
import { ProductPurchaseActions } from './ProductPurchaseActions';

interface ProductInfoProps {
  product: ProductDetail;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US').format(price);
}

function getStockStatus(product: ProductDetail): {
  label: string;
  variant: 'destructive' | 'default' | 'secondary';
} {
  if (product.stockQuantity <= 0) {
    return { label: 'Out of stock', variant: 'destructive' };
  }
  if (product.stockQuantity <= product.lowStockThreshold) {
    return { label: `Low stock (${product.stockQuantity} left)`, variant: 'secondary' };
  }
  return { label: `In stock (${product.stockQuantity})`, variant: 'default' };
}

export function ProductInfo({ product }: ProductInfoProps) {
  const discount = product.promotions[0];
  const stock = getStockStatus(product);

  return (
    <div className="space-y-4">
      {/* [C1] Product Name */}
      <div>
        <h1 className="text-xl font-bold md:text-2xl md:font-bold">{product.name}</h1>
        {product.shortDescription && (
          <p className="mt-1 text-sm text-muted-foreground">{product.shortDescription}</p>
        )}
      </div>

      {/* [C2] Rating Summary */}
      <div className="flex items-center gap-2">
        <StarRating rating={product.avgRating} />
        <span className="text-sm font-medium">{product.avgRating.toFixed(1)}</span>
        <button
          type="button"
          onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
          className="text-sm text-blue-600 hover:underline"
        >
          ({product.reviewCount} reviews)
        </button>
      </div>

      {/* [C3] Price */}
      <div className="flex items-center gap-3">
        <span className="text-2xl font-semibold text-primary">
          {formatPrice(product.price)} MMK
        </span>
        {product.compareAtPrice && (
          <>
            <span className="text-lg text-muted-foreground line-through">
              {formatPrice(product.compareAtPrice)} MMK
            </span>
            <Badge variant="destructive">
              Save {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}%
            </Badge>
          </>
        )}
      </div>

      {/* [C5] Stock Status */}
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant={stock.variant}>{stock.label}</Badge>
        {product.sku && (
          <span className="text-sm text-muted-foreground">SKU: {product.sku}</span>
        )}
      </div>

      {/* [C7] Skin Type Compatibility */}
      {product.skinTypes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {product.skinTypes.map((s) => (
            <span
              key={s}
              className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Discount badge (if promotion exists) */}
      {discount && (
        <Badge variant="secondary">
          {discount.code}:{' '}
          {discount.discountTypeCode === 'percentage'
            ? `${discount.discountValue}% off`
            : `${discount.discountValue} off`}
        </Badge>
      )}

      {/* [D] Purchase Actions — hidden on mobile, shown on desktop */}
      <div className="hidden pt-2 md:block">
        <ProductPurchaseActions product={product} />
      </div>

      {/* [E] Sold By */}
      <p className="text-sm text-muted-foreground">
        Sold by{' '}
        <span className="font-medium text-foreground">
          {product.merchant.shopName}
        </span>
      </p>
    </div>
  );
}