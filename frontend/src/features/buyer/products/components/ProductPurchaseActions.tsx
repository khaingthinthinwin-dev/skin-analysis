import { useState } from 'react';
import { Heart, ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/providers/AuthProvider';
import { useCart } from '@/features/buyer/cart/hooks/useCart';
import { useWishlist } from '@/features/buyer/wishlist/hooks/useWishlist';
import { ProductDetail } from '../services/product.service';
import { QuantityStepper } from './QuantityStepper';

interface ProductPurchaseActionsProps {
  product: ProductDetail;
  className?: string;
}

export function ProductPurchaseActions({ product, className }: ProductPurchaseActionsProps) {
  const { user, isAuthenticated } = useAuth();
  const { addToCart, isAdding } = useCart();
  const { items: wishlistItems, addToWishlist, isAdding: isWishlisting } = useWishlist();

  const [quantity, setQuantity] = useState(1);
  const [cartDuplicateOpen, setCartDuplicateOpen] = useState(false);
  const [wishlistDuplicateOpen, setWishlistDuplicateOpen] = useState(false);

  const inStock = product.stockQuantity > 0;
  const isBuyer = user?.role === 'buyer';
  const isInWishlist = wishlistItems.some((item) => item.productId === product.id);
  const cartDisabled = !inStock || isAdding;
  const wishlistDisabled = !isAuthenticated || !isBuyer || isWishlisting;

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      window.location.href = '/login?redirect=/buyer/products';
      return;
    }
    if (!isBuyer) {
      window.location.href = '/unauthorized';
      return;
    }
    try {
      await addToCart({ productId: product.id, quantity });
      toast.success('Added to cart');
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 409) {
        setCartDuplicateOpen(true);
      }
    }
  };

  const handleAddToWishlist = async () => {
    if (!isAuthenticated) {
      window.location.href = '/login?redirect=/buyer/products';
      return;
    }
    if (!isBuyer) {
      window.location.href = '/unauthorized';
      return;
    }
    try {
      await addToWishlist(product.id);
      toast.success('Added to wishlist');
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 409) {
        setWishlistDuplicateOpen(true);
      }
    }
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
          {isAdding ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ShoppingCart className="h-5 w-5" />
          )}
          {isAdding ? 'Adding...' : 'Add to Cart'}
        </Button>
        <Button
          variant={isInWishlist ? 'default' : 'outline'}
          size="lg"
          className={`gap-2 ${isInWishlist ? 'bg-pink-500 text-white hover:bg-pink-600 border-pink-500' : ''}`}
          onClick={handleAddToWishlist}
          disabled={wishlistDisabled}
          aria-label="Add to wishlist"
        >
          {isWishlisting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-white text-white' : ''}`} />
          )}
          {isInWishlist ? 'Added to Wishlist' : 'Add to Wishlist'}
        </Button>
      </div>

      <Dialog open={cartDuplicateOpen} onOpenChange={setCartDuplicateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Already in Cart</DialogTitle>
            <DialogDescription>This product is already in cart.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setCartDuplicateOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={wishlistDuplicateOpen} onOpenChange={setWishlistDuplicateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Already in Wishlist</DialogTitle>
            <DialogDescription>This product is already in wishlist.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setWishlistDuplicateOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
