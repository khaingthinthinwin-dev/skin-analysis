import { useState } from 'react';
import { ShoppingCart, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/features/buyer/cart/hooks/useCart';
import { CartItemRow } from '@/features/buyer/cart/components/CartItemRow';
import { CartSummaryPanel } from '@/features/buyer/cart/components/CartSummaryPanel';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Cart() {
  const { t } = useTranslation();
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const {
    items,
    summary,
    isLoading,
    isError,
    error,
    refetch,
    updateQuantity,
    removeFromCart,
    clearAllCart,
    isUpdating,
    isRemoving,
    isClearing,
  } = useCart();

  const handleQuantityChange = async (cartItemId: string, quantity: number) => {
    try {
      await updateQuantity({ cartItemId, quantity });
      toast.success(t('cart.quantityUpdated', 'Quantity updated'));
    } catch {
      toast.error(t('cart.failedToUpdate', 'Failed to update quantity'));
    }
  };

  const handleRemove = async (cartItemId: string) => {
    try {
      await removeFromCart(cartItemId);
      toast.success(t('cart.removedFromCart', 'Item removed from cart'));
    } catch {
      toast.error(t('cart.failedToRemove', 'Failed to remove from cart'));
    }
  };

  const handleClearAll = () => {
    setIsClearModalOpen(true);
  };

  const handleConfirmClear = async () => {
    try {
      await clearAllCart();
      toast.success(t('cart.cleared', 'Cart cleared'));
      setIsClearModalOpen(false);
    } catch {
      toast.error(t('cart.failedToClear', 'Failed to clear cart'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-2 lg:p-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border h-24 animate-pulse bg-muted" />
            ))}
          </div>
          <div className="rounded-lg border h-48 animate-pulse bg-muted" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 p-2 lg:p-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-purple-600" />
            {t('cart.title', 'Shopping Cart')}
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-destructive/10 p-6 mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {t('cart.errorTitle', 'Failed to load cart')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {error?.message || t('cart.errorMessage', 'Something went wrong while loading your cart.')}
          </p>
          <Button
            variant="outline"
            className="mt-4 gap-2"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
            {t('cart.retry', 'Try again')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 lg:p-4">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-purple-600" />
            {t('cart.title', 'Shopping Cart')}
          </h1>
          {Array.isArray(items) && items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleClearAll}
              disabled={isClearing}
            >
              <Trash2 className="h-4 w-4" />
              {isClearing
                ? t('cart.clearing', 'Clearing...')
                : t('cart.clearAll', 'All Data Clear')}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t('cart.subtitle', 'Review items in your cart before checkout')}
        </p>
      </div>

      {Array.isArray(items) && items.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-2">
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemove}
                isUpdating={isUpdating}
                isRemoving={isRemoving}
              />
            ))}
          </div>

          <CartSummaryPanel summary={summary} />
        </div>
      ) : (
        <EmptyState variant="cart" />
      )}

      <ConfirmDialog
        open={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
        title={t('cart.clearAllTitle', 'Clear Cart')}
        message={t(
          'cart.clearAllConfirm',
          'Are you sure you want to clear all items from your cart? This action cannot be undone.',
        )}
        confirmLabel={t('cart.clearAllConfirmButton', 'Yes')}
        cancelLabel={t('cart.clearAllCancelButton', 'Cancel')}
        isLoading={isClearing}
      />

    </div>
  );
}
