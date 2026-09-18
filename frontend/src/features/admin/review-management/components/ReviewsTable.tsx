import React from 'react';
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
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Review Content</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                No reviews found.
              </TableCell>
            </TableRow>
          ) : (
            reviews.map((rev) => (
              <TableRow key={rev.id}>
                <TableCell className="font-medium">{rev.product?.name || rev.product?.id}</TableCell>
                <TableCell>★ {rev.rating}/5</TableCell>
                <TableCell className="max-w-xs truncate">{rev.body || rev.title || 'No comment'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusVariants[rev.status] || ''}>
                    {rev.status}
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
