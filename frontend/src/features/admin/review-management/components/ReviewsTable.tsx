import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import type { AdminReview } from '@/features/admin/content-moderation/services/moderation.service';

interface ReviewsTableProps {
  reviews?: AdminReview[];
  onDelete?: (id: string) => void;
}

const statusVariants: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export const ReviewsTable: React.FC<ReviewsTableProps> = ({
  reviews = [],
  onDelete,
}) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.reviews.table.product', 'Product')}</TableHead>
            <TableHead>{t('admin.reviews.table.rating', 'Rating')}</TableHead>
            <TableHead>{t('admin.reviews.table.reviewContent', 'Review Content')}</TableHead>
            <TableHead>{t('admin.reviews.table.status', 'Status')}</TableHead>
            <TableHead className="text-right">{t('admin.reviews.table.actions', 'Actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                {t('admin.reviews.table.emptyReviews', 'No reviews found.')}
              </TableCell>
            </TableRow>
          ) : (
            reviews.map((rev) => (
              <TableRow key={rev.id}>
                <TableCell className="font-medium">{rev.product?.name || rev.product?.id}</TableCell>
                <TableCell>★ {rev.rating}/5</TableCell>
                <TableCell className="max-w-xs truncate">{rev.body || rev.title || t('admin.reviews.table.noComment', 'No comment')}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusVariants[rev.status] || ''}>
                    {t(`admin.reviews.status.${rev.status}`, rev.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => onDelete?.(rev.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
