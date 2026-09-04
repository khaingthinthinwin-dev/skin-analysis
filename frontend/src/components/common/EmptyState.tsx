import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  variant: 'wishlist' | 'cart';
}

export function EmptyState({ variant }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <svg
          className="h-12 w-12 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        {t(`${variant}.emptyTitle`)}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(`${variant}.emptyMessage`)}
      </p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/buyer/search">
          {t(`${variant}.continueShopping`)}
        </Link>
      </Button>
    </div>
  );
}
