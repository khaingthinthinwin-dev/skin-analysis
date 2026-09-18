import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CartSummary } from '@/types/wishlist-cart.types';

interface CartSummaryPanelProps {
  summary: CartSummary;
  isLoading?: boolean;
}

export function CartSummaryPanel({
  summary,
  isLoading,
}: CartSummaryPanelProps) {
  const { t } = useTranslation();

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return `$${num.toFixed(2)}`;
  };

  const shippingAmount = parseFloat(summary.shippingEstimate || '0');
  const totalAmount = parseFloat(summary.total || '0');

  return (
    <Card className="border-border/80 shadow-xs h-fit lg:sticky lg:top-4 overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
        <CardTitle className="text-base font-bold">{t('cart.summary', 'Order Summary')}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0 space-y-3.5 text-xs sm:text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>{t('cart.subtotalLabel', 'Subtotal')}</span>
          <span className="font-semibold text-foreground">
            {formatPrice(summary.subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{t('cart.shippingEstimate', 'Shipping Estimate')}</span>
          <span className="font-semibold text-foreground">
            {shippingAmount === 0 ? 'Free' : formatPrice(String(shippingAmount))}
          </span>
        </div>
        {summary.hasOutOfStock && (
          <p className="text-xs text-destructive font-medium">
            Some items are out of stock
          </p>
        )}
        <div className="pt-3 border-t border-border flex justify-between text-sm sm:text-base font-extrabold text-foreground">
          <span>{t('cart.total', 'Total')}</span>
          <span className="text-purple-600">
            {formatPrice(String(totalAmount))}
          </span>
        </div>
        <div className="space-y-2 pt-2">
          <Button
            asChild
            size="lg"
            className="w-full h-11 text-sm font-bold bg-primary hover:bg-primary/90"
            disabled={!summary.canCheckout || isLoading}
          >
            <Link to="/buyer/checkout">
              {t('cart.checkout', 'Proceed to Checkout')} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full h-10 text-sm">
            <Link to="/buyer/search">{t('cart.continueShopping')}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
