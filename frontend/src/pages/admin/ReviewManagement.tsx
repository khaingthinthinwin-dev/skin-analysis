// [PET] Review Management - Moderate product reviews and handle reports
import React, { useState } from 'react';
import { useModeration } from '@/features/admin/content-moderation/hooks/useModeration';
import { ReviewsTable } from '@/features/admin/review-management/components/ReviewsTable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';

export default function ReviewManagement() {
  const [page] = useState(1);
  const {
    reviewsQuery,
    reviewReportsQuery,
    approveReviewMutation,
    deleteReviewMutation,
    resolveReportMutation,
  } = useModeration({ page, limit: 20 });

  const handleApprove = (id: string) => {
    approveReviewMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: 'Review approved', variant: 'default' });
      },
      onError: () => {
        toast({ title: 'Failed to approve review', variant: 'destructive' });
      },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this review?')) {
      deleteReviewMutation.mutate(id, {
        onSuccess: () => {
          toast({ title: 'Review deleted', variant: 'default' });
        },
        onError: () => {
          toast({ title: 'Failed to delete review', variant: 'destructive' });
        },
      });
    }
  };

  const handleResolveReport = (id: string, action: 'resolved' | 'rejected') => {
    resolveReportMutation.mutate({ id, action }, {
      onSuccess: () => {
        toast({ title: `Report ${action}`, variant: 'default' });
      },
      onError: () => {
        toast({ title: 'Failed to resolve report', variant: 'destructive' });
      },
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Review Management</h1>
        <p className="text-muted-foreground">Moderate product reviews and handle reports</p>
      </div>

      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">
            Reviews
            <Badge variant="secondary" className="ml-2">
              {reviewsQuery.data?.total ?? 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="reports">
            Reports
            <Badge variant="secondary" className="ml-2">
              {reviewReportsQuery.data?.total ?? 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-4">
          <ReviewsTable
            reviews={reviewsQuery.data?.items}
            onApprove={handleApprove}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="rounded-md border bg-card">
            <div className="p-4">
              {reviewReportsQuery.data?.items?.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No review reports.</p>
              ) : (
                <div className="space-y-4">
                  {reviewReportsQuery.data?.items?.map((report: any) => (
                    <div key={report.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">Reason:</span>{' '}
                          <Badge variant="outline">{report.reason}</Badge>
                        </div>
                        <Badge
                          variant={
                            report.status === 'resolved'
                              ? 'default'
                              : report.status === 'rejected'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {report.status}
                        </Badge>
                      </div>
                      {report.description && (
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      )}
                      {report.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolveReport(report.id, 'resolved')}
                            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleResolveReport(report.id, 'rejected')}
                            className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded-md"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
