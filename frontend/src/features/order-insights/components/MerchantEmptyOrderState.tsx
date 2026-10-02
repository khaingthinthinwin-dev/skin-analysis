import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export function MerchantEmptyOrderState({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();
  return <div className="flex flex-col items-center justify-center gap-3 py-12 text-center"><p className="text-muted-foreground">{t('merchant.orders.empty', 'No orders match the current filters.')}</p><Button variant="outline" onClick={onReset}>{t('common.filters.clear', 'Clear Filters')}</Button></div>;
}