import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCreateReview, useCanReview } from '../hooks/useProductDetail';
import { StarRating } from './StarRating';

interface ReviewFormProps {
  idOrSlug: string;
}

export function ReviewForm({ idOrSlug }: ReviewFormProps) {
  const { user } = useAuth();
  const { mutate: createReview, isPending: isSubmitting } = useCreateReview(idOrSlug);
  const { data: canReviewData } = useCanReview(idOrSlug);

  const [draftRating, setDraftRating] = useState(0);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [errors, setErrors] = useState<{ rating?: string; body?: string; submit?: string }>({});

  const isBuyer = user?.role === 'buyer';
  const canReview = canReviewData?.canReview ?? false;

  const validate = (): boolean => {
    const newErrors: { rating?: string; body?: string; submit?: string } = {};
    if (!user) {
      newErrors.submit = 'Please sign in to write a review.';
    } else if (!isBuyer) {
      newErrors.submit = 'Only buyers who purchased this product can leave a review.';
    } else if (!canReview) {
      newErrors.submit = 'You can only review products you have purchased and received.';
    } else {
      if (draftRating === 0) {
        newErrors.rating = 'Please select a rating.';
      }
      if (!draftBody.trim()) {
        newErrors.body = 'Please write your review.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReviewSubmit = () => {
    if (!validate()) return;
    createReview({ rating: draftRating, title: draftTitle, body: draftBody });
  };

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

  return (
    <div className="space-y-3 border-t pt-4">
      <Separator />
      <h3 className="font-medium">Write a review</h3>
      <StarRating rating={draftRating} interactive onRate={(r) => { setDraftRating(r); setErrors((e) => ({ ...e, rating: undefined })); }} />
      {errors.rating && <p className="text-sm text-red-500">{errors.rating}</p>}
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
          onChange={(e) => { setDraftBody(e.target.value); setErrors((e2) => ({ ...e2, body: undefined })); }}
          maxLength={5000}
          rows={4}
        />
        <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {draftBody.length}/5000
        </span>
      </div>
      {errors.body && <p className="text-sm text-red-500">{errors.body}</p>}
      {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}
      <Button onClick={handleReviewSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </div>
  );
}
