import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Trash2 } from 'lucide-react';
import type { Review } from '@/features/admin/content-moderation/services/moderation.service';

interface ReviewsTableProps {
  reviews?: Review[];
  onApprove?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const ReviewsTable: React.FC<ReviewsTableProps> = ({
  reviews = [],
  onApprove,
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
              <TableRow key={String(rev.id)}>
                <TableCell className="font-medium">{rev.product?.name || 'N/A'}</TableCell>
                <TableCell>★ {rev.rating}/5</TableCell>
                <TableCell className="max-w-xs truncate">{rev.body || rev.title || 'No comment'}</TableCell>
                <TableCell>
                  <Badge variant={rev.isApproved ? 'default' : 'outline'}>
                    {rev.isApproved ? 'Approved' : 'Pending'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {!rev.isApproved && (
                    <Button size="icon" variant="ghost" onClick={() => onApprove?.(String(rev.id))}>
                      <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => onDelete?.(String(rev.id))}>
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
