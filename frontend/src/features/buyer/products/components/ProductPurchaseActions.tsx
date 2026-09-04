import { useState } from 'react';
import { Heart, ShoppingCart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/AuthProvider';
import { useAddToCart } from '@/features/buyer/cart/hooks/useCart';
import { useAddToWishlist } from '@/features/buyer/wishlist/hooks/useWishlist';
import { ProductDetail } from '../services/product.service';
import { QuantityStepper } from './QuantityStepper';

interface ProductPurchaseActionsProps {
  product: ProductDetail;
  className?: string;
}

export function ProductPurchaseActions({ product, className }: ProductPurchaseActionsProps) {
  const { user, isAuthenticated } = useAuth();
  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();

  const [quantity, setQuantity] = useState(1);

  const inStock = product.stockQuantity > 0;
  const isBuyer = user?.role === 'buyer';
  const cartDisabled = !inStock || addToCart.isPending;
  const wishlistDisabled =
    !isAuthenticated || !isBuyer || addToWishlist.isPending;

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    if (!isBuyer) {
      window.location.href = '/unauthorized';
      return;
    }
    addToCart.mutate({ productId: product.id, quantity });
  };

  const handleAddToWishlist = () => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    if (!isBuyer) {
      window.location.href = '/unauthorized';
      return;
    }
    addToWishlist.mutate(product.id);
  };

  return (
    <div className={`flex flex-col gap-3 ${className ?? ''}`}>
      <div className="flex items-center gap-3">
        <QuantityStepper value={quantity} max={product.stockQuantity} onChange={setQuantity} />
        <span className="text-sm text-muted-foreground">
          {inStock ? `${product.stockQuantity} in stock` : 'Out of stock'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          className="w-full gap-2 sm:w-auto"
          onClick={handleAddToCart}
          disabled={cartDisabled}
        >
          {addToCart.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ShoppingCart className="h-5 w-5" />
          )}
          {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={handleAddToWishlist}
          disabled={wishlistDisabled}
          aria-label="Add to wishlist"
        >
          {addToWishlist.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Heart className="h-5 w-5" />
          )}
          Add to Wishlist
        </Button>
      </div>
    </div>
  );
}
