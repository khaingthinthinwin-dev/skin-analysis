import { Badge } from '@/components/ui/badge';
import { ProductDetail } from '../services/product.service';
import { StarRating } from './StarRating';
import { ProductPurchaseActions } from './ProductPurchaseActions';
import { useTranslation } from 'react-i18next';

interface ProductInfoProps {
  product: ProductDetail;
}

function formatPrice(price: number | string) {
  return new Intl.NumberFormat('en-US').format(Number(price));
}

function getStockStatus(
  product: ProductDetail,
  labels: {
    outOfStock: string;
    lowStock: (count: number) => string;
    inStock: (count: number) => string;
  },
): {
  label: string;
  variant: 'destructive' | 'default' | 'secondary';
} {
  if (product.stockQuantity <= 0) {
    return { label: labels.outOfStock, variant: 'destructive' };
  }
  if (product.stockQuantity <= product.lowStockThreshold) {
    return { label: labels.lowStock(product.stockQuantity), variant: 'secondary' };
  }
  return { label: labels.inStock(product.stockQuantity), variant: 'default' };
}

export function ProductInfo({ product }: ProductInfoProps) {
  const { t } = useTranslation();
  const discount = product.promotions[0];
  const stock = getStockStatus(product, {
    outOfStock: t('buyer.products.stock.outOfStock', 'Out of stock'),
    lowStock: (count) =>
      t('buyer.products.stock.lowStock', 'Low stock ({{count}} left)', { count }),
    inStock: (count) =>
      t('buyer.products.stock.inStockStatus', 'In stock ({{count}})', { count }),
  });

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
        <span className="text-sm font-medium">{Number(product.avgRating).toFixed(1)}</span>
        <button
          type="button"
          onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
          className="text-sm text-blue-600 hover:underline"
        >
          {t('buyer.products.reviews.countLabel', '({{count}} reviews)', {
            count: product.reviewCount,
          })}
        </button>
      </div>

      {/* [C3] Price */}
      <div className="flex items-center gap-3">
        <span className="text-2xl font-semibold text-primary">
          {t('buyer.products.price.amountInMmk', '{{amount}} MMK', {
            amount: formatPrice(product.price),
          })}
        </span>
        {product.compareAtPrice && (
          <>
            <span className="text-lg text-muted-foreground line-through">
              {t('buyer.products.price.amountInMmk', '{{amount}} MMK', {
                amount: formatPrice(product.compareAtPrice),
              })}
            </span>
            <Badge variant="destructive">
              {t('buyer.products.price.savingsInMmk', 'Save {{amount}} MMK', {
                amount: formatPrice(Number(product.compareAtPrice) - Number(product.price)),
              })}
            </Badge>
          </>
        )}
      </div>

      {/* [C5] Stock Status */}
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant={stock.variant}>{stock.label}</Badge>
        {product.sku && (
          <span className="text-sm text-muted-foreground">
            {t('buyer.products.product.sku', 'SKU: {{sku}}', { sku: product.sku })}
          </span>
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
            ? t('buyer.products.promotion.discountPercentOff', '{{discountValue}}% off', {
                discountValue: discount.discountValue,
              })
            : t('buyer.products.promotion.discountAmountOff', '{{amount}} off', {
                amount: discount.discountValue,
              })}
        </Badge>
      )}

      {/* [D] Purchase Actions — hidden on mobile, shown on desktop */}
      <div className="hidden pt-2 md:block">
        <ProductPurchaseActions product={product} />
      </div>

      {/* [E] Sold By */}
      <p className="text-sm text-muted-foreground">
        {t('buyer.products.product.soldBy', 'Sold by {{shopName}}', {
          shopName: product.merchant.shopName,
        })}
      </p>
    </div>
  );
}