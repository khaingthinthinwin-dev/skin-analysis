import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Placement } from '@/types/admin-ad-management';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ADMIN_AD_PLACEMENTS } from '@/types/admin-ad-management';
import { PLACEMENT_LABELS } from '@/features/admin/advertisement-management/utils/labels';

const HEAD_CLASS = 'whitespace-nowrap font-bold';
const PLACEMENT_LABEL_KEYS: Record<Placement, string> = {
  search_page_banner: 'admin.masterData.placements.searchPageBanner',
  recommendation_page_banner: 'admin.masterData.placements.recommendationPageBanner',
  checkout_page_banner: 'admin.masterData.placements.checkoutPageBanner',
  productDetail_page_banner: 'admin.masterData.placements.productDetailPageBanner',
};

export const AdPlacementsTable: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <Table className="w-full">
        <TableHeader className="sticky top-0 z-10 bg-primary/10">
          <TableRow className="bg-primary/10 hover:bg-primary/10">
            <TableHead className={HEAD_CLASS}>{t('admin.masterData.placements.code', 'Placement Code')}</TableHead>
            <TableHead className={HEAD_CLASS}>{t('admin.masterData.placements.name', 'Placement Name')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ADMIN_AD_PLACEMENTS.map((placement) => (
            <TableRow
              key={placement}
              className="transition-colors duration-150 ease-in-out hover:bg-muted/40"
            >
              <TableCell className="font-mono text-xs">{placement}</TableCell>
              <TableCell>{t(PLACEMENT_LABEL_KEYS[placement], PLACEMENT_LABELS[placement])}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};