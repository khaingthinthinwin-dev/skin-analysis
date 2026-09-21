import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { CreditCard, Loader2 } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import {
  useCheckoutData,
  useValidateCoupon,
  usePlaceOrder,
  useSponsoredAds,
} from '@/features/buyer/checkout/hooks/useCheckout';
import { OrderSummary } from '@/features/buyer/checkout/components/OrderSummary';
import { CheckoutForm } from '@/features/buyer/checkout/components/CheckoutForm';
import type {
  CouponValidation,
  ShippingAddress,
  PaymentMethod,
} from '@/types/checkout.types';
import { SponsoredAdSlider } from '@/features/buyer/checkout/components/SponsoredAdSlider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface MerchantCoupon {
  coupon: CouponValidation;
  code: string;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    data: checkoutData,
    isLoading: isCheckoutLoading,
    isError: isCheckoutError,
  } = useCheckoutData();
  const validateCouponMutation = useValidateCoupon();
  const placeOrderMutation = usePlaceOrder();
  const { data: sponsoredAds = [] } = useSponsoredAds();

  const [appliedByMerchant, setAppliedByMerchant] = useState<
    Record<string, MerchantCoupon>
  >({});

  const handleApplyCoupon = useCallback(
    async (merchantId: string, code: string, shopSubtotal: number) => {
      try {
        const result = await validateCouponMutation.mutateAsync({
          couponCode: code,
          subtotal: shopSubtotal,
        });
        setAppliedByMerchant((prev) => ({
          ...prev,
          [merchantId]: { coupon: result, code },
        }));
        toast.success('Coupon applied successfully');
      } catch {
        toast.error('Invalid coupon code');
      }
    },
    [validateCouponMutation],
  );

  const handleRemoveCoupon = useCallback((merchantId: string) => {
    setAppliedByMerchant((prev) => {
      const next = { ...prev };
      delete next[merchantId];
      return next;
    });
    toast.success('Coupon removed');
  }, []);

  const handlePlaceOrder = async (data: {
    shippingAddress: ShippingAddress;
    paymentMethod: PaymentMethod;
    notes: string;
  }) => {
    try {
      const voucherCodesMap: Record<string, string> = {};
      for (const [mid, entry] of Object.entries(appliedByMerchant)) {
        voucherCodesMap[mid] = entry.code;
      }
      const voucherCodeValues = Object.values(voucherCodesMap);
      const result = await placeOrderMutation.mutateAsync({
        shippingAddress: data.shippingAddress,
        paymentMethod: data.paymentMethod,
        couponCode:
          voucherCodeValues.length > 0 ? voucherCodeValues.join(', ') : undefined,
        voucherCodes:
          Object.keys(voucherCodesMap).length > 0 ? voucherCodesMap : undefined,
        notes: data.notes || undefined,
      });
      toast.success('Order placed successfully!');
      navigate(`/buyer/checkout/confirmation/${result.orderId}`);
    } catch {
      toast.error('Failed to place order. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <Dialog open onOpenChange={() => navigate('/buyer/cart')}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log in to checkout</DialogTitle>
            <DialogDescription className="text-center">
              Please log in to complete your purchase.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="w-full" onClick={() => navigate('/login?redirect=%2Fcheckout')}>
              Log in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (isCheckoutLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isCheckoutError || !checkoutData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h2 className="text-xl font-bold">Unable to load checkout</h2>
        <p className="text-muted-foreground">
          Your cart may be empty or an error occurred.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-2 lg:p-4">
      <header className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" /> Checkout
        </h1>
        <p className="text-sm text-muted-foreground">
          Complete your order details securely
        </p>
        </div>
        <Link to="/buyer/cart" className="text-sm text-muted-foreground hover:text-primary">
          ← Back to Cart
        </Link>
      </header>

      <SponsoredAdSlider ads={sponsoredAds} />

      <CheckoutForm
        summary={
          <OrderSummary
            items={checkoutData.items}
            subtotal={checkoutData.subtotal}
            appliedByMerchant={appliedByMerchant}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={handleRemoveCoupon}
            isCouponLoading={validateCouponMutation.isPending}
          />
        }
        onSubmit={handlePlaceOrder}
        isSubmitting={placeOrderMutation.isPending}
      />
      {placeOrderMutation.isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" role="status" aria-live="polite">
          <div className="flex items-center gap-3 rounded-lg border bg-background px-5 py-4 shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Processing your order...</span>
          </div>
        </div>
      )}
    </div>
  );
}
