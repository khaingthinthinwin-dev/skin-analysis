import { useState } from 'react';
import { Link } from 'react-router';
import { ShoppingCart, Trash2, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { WishlistItem } from '@/types/wishlist-cart.types';

function getImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const base = raw.replace(/\/api\/v1\/?$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
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
  const [imgError, setImgError] = useState(false);
  const imageUrl = getImageUrl(item.productImage);

  return (
    <Card className="group overflow-hidden border-border/80 shadow-xs transition-transform hover:-translate-y-1">
      <Link to={`/buyer/products/${item.productSlug}`} className="relative block aspect-square w-full bg-muted">
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
          aria-label={`Remove ${item.productName} from wishlist`}
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </Link>

      <CardContent className="p-4 space-y-3">
        <div>
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">
            {item.category || 'Uncategorized'}
          </span>
          <Link
            to={`/buyer/products/${item.productSlug}`}
            className="block text-sm font-bold text-foreground line-clamp-1 mt-0.5 hover:text-primary hover:underline"
          >
            {item.productName}
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-end gap-2">
            <span className="text-base font-extrabold text-foreground">
              {item.productPrice}
            </span>
            {item.compareAtPrice &&
              parseFloat(item.compareAtPrice) > parseFloat(item.productPrice) && (
                <span className="pb-0.5 text-xs text-muted-foreground line-through">
                  {item.compareAtPrice}
                </span>
              )}
          </div>
          <Button
            size="sm"
            disabled={!item.isInStock || isMoving}
            className="gap-1 text-xs"
            onClick={() => onMoveToCart(item.productId)}
          >
            {isMoving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShoppingCart className="h-3.5 w-3.5" />
            )}{' '}
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
