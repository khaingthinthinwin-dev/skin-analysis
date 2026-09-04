import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Copy, Check } from 'lucide-react';
import { ActivePromotion } from '../services/product.service';

interface ActivePromotionProps {
  promotion: ActivePromotion;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function ActivePromotionCard({ promotion }: ActivePromotionProps) {
  const [copied, setCopied] = useState(false);

  const isPercentage = promotion.discountTypeCode === 'percentage';
  const discountLabel = isPercentage
    ? `${promotion.discountValue}% off`
    : `${formatCurrency(promotion.discountValue)} off`;

  const balance =
    promotion.maxUses === null
      ? 'Unlimited'
      : `${Math.max(0, promotion.maxUses - promotion.usedCount)} left`;

  const validity =
    promotion.startsAt && promotion.expiresAt
      ? `${new Date(promotion.startsAt).toLocaleDateString()} ~ ${new Date(
          promotion.expiresAt,
        ).toLocaleDateString()}`
      : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promotion.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Card className="border-dashed p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Active Promotion
        </p>
        <Badge variant="secondary">{discountLabel}</Badge>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded border border-dashed px-2 py-0.5 font-mono text-sm hover:bg-accent"
          aria-label={`Copy promotion code ${promotion.code}`}
        >
          {promotion.code}
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <span className="text-xs text-muted-foreground">
          {copied ? 'Copied!' : 'Click to copy'}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        {promotion.minOrderAmount !== null && (
          <p>Min. order {formatCurrency(promotion.minOrderAmount)}</p>
        )}
        {validity && <p>Valid: {validity}</p>}
        <p>
          {promotion.usedCount} used · {balance} left
        </p>
      </div>
    </Card>
  );
}
