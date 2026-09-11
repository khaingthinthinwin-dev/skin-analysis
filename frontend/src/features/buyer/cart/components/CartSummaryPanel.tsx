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
    <Card className="border-border/80 shadow-xs h-fit lg:sticky lg:top-4">
      <CardHeader>
        <CardTitle className="text-base">{t('cart.summary', 'Order Summary')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>{t('cart.subtotalLabel', 'Subtotal')}</span>
          <span className="font-bold text-foreground">
            {formatPrice(summary.subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{t('cart.shippingEstimate', 'Shipping Estimate')}</span>
          <span className="font-bold text-foreground">
            {formatPrice(String(shippingAmount))}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{t('cart.total', 'Total')}</span>
          <span className="font-bold text-foreground">
            {formatPrice(String(totalAmount))}
          </span>
        </div>
        {summary.hasOutOfStock && (
          <p className="text-xs text-destructive">
            Some items are out of stock
          </p>
        )}
        <div className="pt-3 border-t border-border flex justify-between text-sm font-extrabold text-foreground">
          <span>{t('cart.total', 'Total')}</span>
          <span className="text-purple-600">
            {formatPrice(String(totalAmount))}
          </span>
        </div>
        <Button
          asChild
          size="lg"
          className="w-full mt-4 font-bold bg-primary"
          disabled={!summary.canCheckout || isLoading}
        >
          <Link to="/buyer/checkout">
            {t('cart.checkout', 'Proceed to Checkout')} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link to="/buyer/search">{t('cart.continueShopping')}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
