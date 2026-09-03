import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StockStatus } from '@/types/wishlist-cart.types';

interface StockBadgeProps {
  status: StockStatus;
  stockQuantity?: number;
  className?: string;
}

export function StockBadge({ status, stockQuantity, className }: StockBadgeProps) {
  const config = {
    IN_STOCK: {
      label: 'In Stock',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    LOW_STOCK: {
      label: stockQuantity != null ? `Only ${stockQuantity} left` : 'Low Stock',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    OUT_OF_STOCK: {
      label: 'Out of Stock',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
  };

  const { label, className: badgeClass } = config[status] ?? config.OUT_OF_STOCK;

  return (
    <Badge variant="outline" className={cn(badgeClass, className)}>
      {label}
    </Badge>
  );
}
