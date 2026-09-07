import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCreateReview } from '../hooks/useProductDetail';
import { StarRating } from './StarRating';

interface ReviewFormProps {
  idOrSlug: string;
}

export function ReviewForm({ idOrSlug }: ReviewFormProps) {
  const { user } = useAuth();
  const { mutate: createReview, isPending: isSubmitting } = useCreateReview(idOrSlug);

  const [draftRating, setDraftRating] = useState(0);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');

  const handleReviewSubmit = () => {
    if (!user || draftRating === 0) return;
    createReview({ rating: draftRating, title: draftTitle, body: draftBody });
  };

  const isBuyer = user?.role === 'buyer';

  if (!user) {
    return (
      <p className="pt-4 text-sm text-muted-foreground">
        <a href="/login" className="text-blue-600 hover:underline">
          Sign in
        </a>{' '}
        to write a review.
      </p>
    );
  }

  if (!isBuyer) {
    return (
      <p className="pt-4 text-sm text-muted-foreground">
        Only buyers who purchased this product can leave a review.
      </p>
    );
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <Separator />
      <h3 className="font-medium">Write a review</h3>
      <StarRating rating={draftRating} interactive onRate={setDraftRating} />
      <Input
        placeholder="Title (optional)"
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        maxLength={255}
      />
      <div className="relative">
        <Textarea
          placeholder="Share your experience..."
          value={draftBody}
          onChange={(e) => setDraftBody(e.target.value)}
          maxLength={5000}
          rows={4}
        />
        <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {draftBody.length}/5000
        </span>
      </div>
      <Button onClick={handleReviewSubmit} disabled={isSubmitting || draftRating === 0}>
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </div>
  );
}
