import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ShoppingCart, Trash2, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import type { WishlistItem } from '@/types/wishlist-cart.types';

function getImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const base = raw.replace(/\/api\/v1\/?$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

function formatPrice(price: string | null | undefined): string {
  const num = Number.parseFloat(price ?? '');
  if (Number.isNaN(num)) return '0Ks';
  return `${Math.round(num).toLocaleString('en-US')}Ks`;
}

interface WishlistItemCardProps {
  item: WishlistItem;
  onMoveToCart: (productId: string) => void;
  onRemove: (productId: string) => void;
  isMoving?: boolean;
  isRemoving?: boolean;
}

export function WishlistItemCard({
  item,
  onMoveToCart,
  onRemove,
  isMoving,
  isRemoving,
}: WishlistItemCardProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [imgError, setImgError] = useState(false);
  const imageUrl = getImageUrl(item.productImage);
  const productLink = isAuthenticated ? `/buyer/wishlist/products/${item.productSlug}` : `/products/${item.productSlug}`;

  return (
    <Card className="group overflow-hidden border-border/80 shadow-xs transition-transform hover:-translate-y-1">
      <Link to={productLink} className="relative block aspect-square w-full bg-muted">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={item.productName}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}

        <Button
          size="icon"
          variant="ghost"
          disabled={isRemoving}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm text-destructive hover:text-destructive/80 transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(item.productId);
          }}
          aria-label={t('wishlist.removeProduct', { product: item.productName })}
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </Link>

      <CardContent className="p-2.5 sm:p-4 space-y-2 sm:space-y-3">
        <div>
          <span className="text-[10px] sm:text-[11px] font-bold text-purple-600 uppercase tracking-wider block truncate">
            {item.category || t('wishlist.uncategorized')}
          </span>
          <Link
            to={productLink}
            className="block text-xs sm:text-sm font-bold text-foreground line-clamp-2 sm:line-clamp-1 mt-0.5 hover:text-primary hover:underline leading-snug"
          >
            {item.productName}
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-extrabold text-foreground">
              {formatPrice(item.productPrice)}
            </span>
            {item.compareAtPrice &&
              parseFloat(item.compareAtPrice) > parseFloat(item.productPrice) && (
                <span className="text-[10px] sm:text-xs text-muted-foreground line-through">
                  {formatPrice(item.compareAtPrice)}
                </span>
              )}
          </div>
          <Button
            size="icon"
            disabled={!item.isInStock || isMoving}
            className="h-9 w-9 shrink-0 rounded-full bg-violet-600 p-0 text-white shadow-sm hover:bg-violet-700"
            onClick={() => onMoveToCart(item.productId)}
            aria-label={t('wishlist.moveToCart')}
            title={t('wishlist.moveToCart')}
          >
            {isMoving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
