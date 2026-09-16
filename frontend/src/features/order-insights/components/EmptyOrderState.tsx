'use client';

import { useTranslation } from 'react-i18next';
import { Package, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function EmptyOrderState() {
  const { t } = useTranslation();

  return (
    <Card className="border-border/80 shadow-xs">
      <CardContent className="py-16 px-4 text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
          <Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t('orders.empty.title', 'No orders yet')}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          {t('orders.empty.description', "You haven't placed any orders yet.")}
        </p>
        <Button className="gap-2" onClick={() => window.location.href = '/products'}>
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          {t('orders.empty.cta', 'Browse Products')}
        </Button>
      </CardContent>
    </Card>
  );
}
