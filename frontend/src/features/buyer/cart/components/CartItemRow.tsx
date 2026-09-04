import { Link } from 'react-router';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/common/QuantityStepper';
import { StockBadge } from '@/components/common/StockBadge';
import type { CartItem } from '@/types/wishlist-cart.types';

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
  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="flex items-center gap-4 p-4 border-b border-border/50 last:border-0">
      {item.productImage ? (
        <Link to={`/buyer/products/${item.productSlug}`}>
          <img
            src={item.productImage}
            alt={item.productName}
            className="h-20 w-20 rounded-md object-cover"
          />
        </Link>
      ) : (
        <Link
          to={`/buyer/products/${item.productSlug}`}
          className="block h-20 w-20 rounded-md bg-muted"
        />
      )}

      <div className="flex-1 min-w-0">
        <Link
          to={`/buyer/products/${item.productSlug}`}
          className="text-sm font-medium text-foreground hover:underline line-clamp-1"
        >
          {item.productName}
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatPrice(item.unitPrice)} each
        </p>

        <div className="mt-2">
          <StockBadge
            status={item.stockStatus}
            stockQuantity={item.stockQuantity}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <QuantityStepper
          value={item.quantity}
          onChange={(qty) => onQuantityChange(item.id, qty)}
          max={Math.min(99, item.stockQuantity)}
          disabled={isUpdating || !item.isAvailable}
        />

        <span className="text-sm font-extrabold text-foreground w-16 text-right">
          {formatPrice(item.subtotal)}
        </span>

        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(item.id)}
          disabled={isRemoving}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
