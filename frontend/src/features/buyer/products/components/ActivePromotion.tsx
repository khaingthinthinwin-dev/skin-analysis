import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ActivePromotion } from '../services/product.service';

interface ActivePromotionProps {
  promotion: ActivePromotion;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function ActivePromotionCard({ promotion }: ActivePromotionProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const isPercentage = promotion.discountTypeCode === 'percentage';
  const discountLabel = isPercentage
    ? t('buyer.products.promotion.discountPercentOff', '{{discountValue}}% off', {
        discountValue: promotion.discountValue,
      })
    : t('buyer.products.promotion.discountAmountOff', '{{amount}} off', {
        amount: formatCurrency(promotion.discountValue),
      });

  const balance =
    promotion.maxUses === null
      ? t('buyer.products.promotion.unlimited', 'Unlimited')
      : t('buyer.products.promotion.usesLeft', '{{count}} left', {
          count: Math.max(0, promotion.maxUses - promotion.usedCount),
        });

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
          {t('buyer.products.promotion.title', 'Active Promotion')}
        </p>
        <Badge variant="secondary">{discountLabel}</Badge>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded border border-dashed px-2 py-0.5 font-mono text-sm hover:bg-accent"
          aria-label={t('buyer.products.promotion.copyCode', 'Copy promotion code {{code}}', {
            code: promotion.code,
          })}
        >
          {promotion.code}
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <span className="text-xs text-muted-foreground">
          {copied
            ? t('buyer.products.promotion.copied', 'Copied!')
            : t('buyer.products.promotion.clickToCopy', 'Click to copy')}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        {promotion.minOrderAmount !== null && (
          <p>
            {t('buyer.products.promotion.minimumOrder', 'Min. order {{amount}}', {
              amount: formatCurrency(promotion.minOrderAmount),
            })}
          </p>
        )}
        {validity && (
          <p>{t('buyer.products.promotion.validity', 'Valid: {{validity}}', { validity })}</p>
        )}
        <p>
          {t('buyer.products.promotion.usageSummary', '{{usedCount}} used · {{balance}} left', {
            usedCount: promotion.usedCount,
            balance,
          })}
        </p>
      </div>
    </Card>
  );
}
