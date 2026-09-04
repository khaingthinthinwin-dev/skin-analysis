import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useProductReviews } from '../hooks/useProductDetail';
import { StarRating } from './StarRating';
import { ReviewReportDialog } from './ReviewReportDialog';

interface ProductReviewsProps {
  idOrSlug: string;
}

export function ProductReviews({ idOrSlug }: ProductReviewsProps) {
  const [page, setPage] = useState(1);
  const [reportReviewId, setReportReviewId] = useState<string | null>(null);

  const { data, isLoading, isError } = useProductReviews(idOrSlug, { page, limit: 10 });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading reviews...</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-muted-foreground">Unable to load reviews.</p>;
  }

  if (data.items.length === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet.</p>;
  }

  const hasMore = data.page < data.totalPages;

  return (
    <div className="space-y-4">
      {data.items.map((review) => (
        <div key={review.id} className="group rounded-lg border p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {review.user.avatarUrl && (
                  <AvatarImage src={review.user.avatarUrl} alt={review.user.name} />
                )}
                <AvatarFallback>{review.user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{review.user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} size="sm" />
              {review.isVerifiedPurchase && (
                <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-medium text-green-700">
                  Verified
                </span>
              )}
              <button
                type="button"
                onClick={() => setReportReviewId(review.id)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                aria-label="Report this review"
                title="Report this review"
              >
                <Flag className="h-4 w-4" />
              </button>
            </div>
          </div>
          {review.title && <p className="mb-1 font-medium">{review.title}</p>}
          {review.body && <p className="text-sm text-muted-foreground">{review.body}</p>}
          {review.images && review.images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {review.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Review image ${i + 1}`}
                  className="h-20 w-20 rounded-md object-cover"
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {hasMore && (
        <div className="flex items-center justify-center pt-2">
          <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
            Load more reviews
          </Button>
        </div>
      )}

      {reportReviewId && (
        <ReviewReportDialog
          reviewId={reportReviewId}
          open={!!reportReviewId}
          onOpenChange={(open) => {
            if (!open) setReportReviewId(null);
          }}
        />
      )}
    </div>
  );
}
