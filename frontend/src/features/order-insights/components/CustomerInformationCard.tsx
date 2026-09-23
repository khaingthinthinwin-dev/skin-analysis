import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { MerchantCustomerInfoDto } from '../types/merchantOrderFulfillment.types';

interface CustomerInformationCardProps {
  customer: MerchantCustomerInfoDto;
}

/** Merchant-only customer block (BR-OI-015/033): name, email and phone. */
export function CustomerInformationCard({ customer }: CustomerInformationCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="min-w-0 rounded-xl border-[#f3f4f6] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <CardContent className="p-5">
        <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#111827]">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300" aria-hidden="true">
            <User className="h-5 w-5" />
          </span>
          {t('merchant.orders.customer', 'Customer')}
        </h2>
        <dl className="ml-0 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[#6b7280]">{t('merchant.orders.customerName', 'Name')}</dt>
            <dd className="text-right font-medium text-[#111827]">{customer.name}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[#6b7280]">{t('merchant.orders.customerEmail', 'Email')}</dt>
            <dd className="break-all text-right font-medium text-[#111827]">{customer.email}</dd>
          </div>
          {customer.phone && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#6b7280]">{t('merchant.orders.customerPhone', 'Phone')}</dt>
              <dd className="text-right font-medium text-[#111827]">{customer.phone}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}