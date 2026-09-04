import { useState } from 'react';
import { Heart, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWishlist } from '@/features/buyer/wishlist/hooks/useWishlist';
import { WishlistItemCard } from '@/features/buyer/wishlist/components/WishlistItemCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DuplicateCartAlertDialog } from '@/components/common/DuplicateCartAlertDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCart } from '@/features/buyer/cart/hooks/useCart';
import { toast } from 'sonner';

export default function Wishlist() {
  const { t } = useTranslation();
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isDuplicateCartAlertOpen, setIsDuplicateCartAlertOpen] = useState(false);

  const {
    items,
    totalCount,
    isLoading,
    isError,
    error,
    refetch,
    removeFromWishlist,
    moveToCart,
    clearAllWishlist,
    isRemoving,
    isMoving,
    isClearing,
  } = useWishlist();
  const { items: cartItems } = useCart();

  const handleRemove = async (productId: string) => {
    try {
      await removeFromWishlist(productId);
      toast.success(t('wishlist.removedFromWishlist', 'Removed from wishlist'));
    } catch {
      toast.error(t('wishlist.failedToRemove', 'Failed to remove from wishlist'));
    }
  };

  const handleMoveToCart = async (productId: string) => {
    if (cartItems.some((item) => item.productId === productId)) {
      setIsDuplicateCartAlertOpen(true);
      return;
    }
    try {
      await moveToCart(productId);
      toast.success(t('wishlist.movedToCart', 'Moved to cart'));
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      if (message === 'This product is already in cart.') {
        setIsDuplicateCartAlertOpen(true);
      } else {
        toast.error(t('wishlist.failedToMove', 'Failed to move to cart'));
      }
    }
  };

  const handleClearAll = () => {
    setIsClearModalOpen(true);
  };

  const handleConfirmClear = async () => {
    try {
      await clearAllWishlist();
      toast.success(t('wishlist.cleared', 'Wishlist cleared'));
      setIsClearModalOpen(false);
    } catch {
      toast.error(t('wishlist.failedToClear', 'Failed to clear wishlist'));
    }
  };

  const hasWishlistItems = Array.isArray(items) && items.length > 0;
  const countText =
    (totalCount ?? items.length ?? 0) === 1
      ? '1 item saved for future purchase'
      : `${totalCount ?? items.length ?? 0} items saved for future purchase`;

  if (isLoading) {
    return (
      <div className="space-y-6 p-2 lg:p-4">
        <div>
          <Skeleton className="h-9 w-56 mb-2" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 p-2 lg:p-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
            <Heart className="h-7 w-7 text-pink-500 fill-pink-500" />
            {t('wishlist.title', 'My Saved Wishlist')}
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-destructive/10 p-6">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {t('wishlist.errorTitle', 'Failed to load wishlist')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {error?.message ||
              t('wishlist.errorMessage', 'Something went wrong while loading your wishlist.')}
          </p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            {t('wishlist.retry', 'Try again')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 lg:p-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
            <Heart className="h-7 w-7 text-pink-500 fill-pink-500" />
            {t('wishlist.title', 'My Saved Wishlist')}
          </h1>
          {hasWishlistItems && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleClearAll}
              disabled={isClearing}
            >
              <Trash2 className="h-4 w-4" />
              {isClearing
                ? t('wishlist.clearing', 'Clearing...')
                : t('wishlist.clearAll', 'All Data Clear')}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{countText}</p>
      </div>

      {!hasWishlistItems ? (
        <EmptyState variant="wishlist" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <WishlistItemCard
              key={item.id}
              item={item}
              onMoveToCart={handleMoveToCart}
              onRemove={handleRemove}
              isMoving={isMoving}
              isRemoving={isRemoving}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
        title={t('wishlist.clearAllTitle', 'Clear Wishlist')}
        message={t(
          'wishlist.clearAllConfirm',
          'Are you sure you want to clear all items from your wishlist? This action cannot be undone.',
        )}
        confirmLabel={t('wishlist.clearAllConfirmButton', 'Yes')}
        cancelLabel={t('wishlist.clearAllCancelButton', 'Cancel')}
        isLoading={isClearing}
      />
      <DuplicateCartAlertDialog
        open={isDuplicateCartAlertOpen}
        onClose={() => setIsDuplicateCartAlertOpen(false)}
      />
    </div>
  );
}
