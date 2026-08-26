// [PET] Content Moderation - Review and deactivate policy-violating products
import React from 'react';
import { useModeration } from '@/features/admin/content-moderation/hooks/useModeration';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ContentModeration() {
  const { flaggedContentQuery, deactivateProductMutation } = useModeration();

  const handleRemove = (productId: string, productName: string) => {
    if (confirm(`Are you sure you want to remove "${productName}"?`)) {
      deactivateProductMutation.mutate(productId, {
        onSuccess: () => {
          toast({
            title: 'Product removed',
            description: `"${productName}" has been deactivated successfully.`,
            variant: 'default',
          });
        },
        onError: () => {
          toast({
            title: 'Remove failed',
            description: `Failed to remove "${productName}". Please try again.`,
            variant: 'destructive',
          });
        },
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Moderation</h1>
        <p className="text-muted-foreground">Review and deactivate policy-violating products or content</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Flagged/Deactivated Products:</span>
            <Badge variant="secondary">{flaggedContentQuery.data?.total ?? 0}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flaggedContentQuery.data?.items?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
                  No flagged content found. All products are compliant.
                </TableCell>
              </TableRow>
            ) : (
              flaggedContentQuery.data?.items?.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category?.name || 'N/A'}</TableCell>
                  <TableCell>{product.merchant?.shopName || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">Deactivated</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemove(product.id, product.name)}
                      disabled={deactivateProductMutation.isPending}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
