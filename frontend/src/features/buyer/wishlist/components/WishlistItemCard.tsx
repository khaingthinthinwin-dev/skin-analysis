import { Link } from 'react-router';
import { ShoppingCart, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { WishlistItem } from '@/types/wishlist-cart.types';

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
  return (
    <Card className="group overflow-hidden border-border/80 shadow-xs transition-transform hover:-translate-y-1">
      <div className="relative h-44 bg-gradient-to-tr from-purple-100/60 via-purple-50/30 to-pink-100/60 flex items-center justify-center p-4">
        {item.productImage ? (
          <Link to={`/buyer/products/${item.productSlug}`}>
            <img
              src={item.productImage}
              alt={item.productName}
              className="h-28 w-28 rounded-2xl object-cover shadow-md"
            />
          </Link>
        ) : (
          <Link
            to={`/buyer/products/${item.productSlug}`}
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/80 shadow-md"
          >
            <Sparkles className="h-10 w-10 text-purple-600" />
          </Link>
        )}

        <Button
          size="icon"
          variant="ghost"
          disabled={isRemoving}
          className="absolute top-3 right-3 text-destructive hover:text-destructive/80 transition-colors"
          onClick={() => onRemove(item.productId)}
          aria-label={`Remove ${item.productName} from wishlist`}
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>

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

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
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
            className="gap-1.5 bg-primary text-xs font-bold"
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
