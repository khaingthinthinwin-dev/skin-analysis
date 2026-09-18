import { Link } from 'react-router';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/common/QuantityStepper';
import { StockBadge } from '@/components/common/StockBadge';
import { useAuth } from '@/hooks/useAuth';
import type { CartItem } from '@/types/wishlist-cart.types';

function getImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const base = raw.replace(/\/api\/v1\/?$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

interface CartItemRowProps {
  item: CartItem;
  onQuantityChange: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
  isUpdating?: boolean;
  isRemoving?: boolean;
}

export function CartItemRow({
  item,
  onQuantityChange,
  onRemove,
  isUpdating,
  isRemoving,
}: CartItemRowProps) {
  const { isAuthenticated } = useAuth();
  const productLink = isAuthenticated ? `/buyer/products/${item.productSlug}` : `/products/${item.productSlug}`;

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card shadow-xs transition-colors hover:border-border">
      {/* Top / Left section: Image + Details + Mobile Delete Button */}
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
        {item.productImage ? (
          <Link to={productLink} className="shrink-0">
            <img
              src={getImageUrl(item.productImage)}
              alt={item.productName}
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover border border-border/40"
            />
          </Link>
        ) : (
          <Link
            to={productLink}
            className="shrink-0 block h-16 w-16 sm:h-20 sm:w-20 rounded-lg bg-muted border border-border/40"
          />
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <Link
            to={productLink}
            className="text-sm font-semibold text-foreground hover:underline line-clamp-2 sm:line-clamp-1 block leading-snug"
          >
            {item.productName}
          </Link>
          <p className="text-xs text-muted-foreground">
            {formatPrice(item.unitPrice)} each
          </p>

          <div className="pt-0.5">
            <StockBadge
              status={item.stockStatus}
              stockQuantity={item.stockQuantity}
            />
          </div>
        </div>

        {/* Remove button visible on mobile top-right */}
        <Button
          size="icon"
          variant="ghost"
          className="sm:hidden -mr-1 -mt-1 h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => onRemove(item.id)}
          disabled={isRemoving}
          aria-label="Remove item"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Bottom / Right section: Quantity Stepper + Subtotal + Desktop Remove Button */}
      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0 w-full sm:w-auto">
        <QuantityStepper
          value={item.quantity}
          onChange={(qty) => onQuantityChange(item.id, qty)}
          max={Math.min(99, item.stockQuantity)}
          disabled={isUpdating || !item.isAvailable}
        />

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-sm sm:text-base font-extrabold text-foreground min-w-[64px] text-right">
            {formatPrice(item.subtotal)}
          </span>

          <Button
            size="icon"
            variant="ghost"
            className="hidden sm:inline-flex text-muted-foreground hover:text-destructive h-9 w-9"
            onClick={() => onRemove(item.id)}
            disabled={isRemoving}
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
