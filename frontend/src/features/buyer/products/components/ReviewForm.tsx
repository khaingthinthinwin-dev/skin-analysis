import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const { mutate: createReview, isPending: isSubmitting } = useCreateReview(idOrSlug);
  const { data: canReviewData, isPending: isCheckingEligibility, isError: isEligibilityError } =
    useCanReview(idOrSlug);

  const [draftRating, setDraftRating] = useState(0);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [errors, setErrors] = useState<{ rating?: string; body?: string; submit?: string }>({});

  const isBuyer = user?.role === 'buyer';
  const canReview = canReviewData?.canReview ?? false;

  const validate = (): boolean => {
    const newErrors: { rating?: string; body?: string; submit?: string } = {};
    if (!user) {
      newErrors.submit = t(
        'buyer.products.reviewForm.signInRequired',
        'Please sign in to write a review.',
      );
    } else if (!isBuyer) {
      newErrors.submit = t(
        'buyer.products.reviewForm.buyerOnly',
        'Only buyers who purchased this product can leave a review.',
      );
    } else if (isCheckingEligibility) {
      newErrors.submit = t(
        'buyer.products.reviewForm.checkingPurchase',
        'Checking your purchase... please try again in a moment.',
      );
    } else if (isEligibilityError) {
      newErrors.submit = t(
        'buyer.products.reviewForm.verifyPurchaseError',
        'We could not verify your purchase. Please refresh and try again.',
      );
    } else if (!canReview) {
      newErrors.submit =
        canReviewData?.reason === 'already_reviewed'
          ? t(
              'buyer.products.reviewForm.alreadyReviewed',
              'You have already reviewed this product.',
            )
          : t(
              'buyer.products.reviewForm.purchaseRequired',
              'You can only review products you have purchased and received.',
            );
    } else {
      if (draftRating === 0) {
        newErrors.rating = t('buyer.products.reviewForm.ratingRequired', 'Please select a rating.');
      }
      if (!draftBody.trim()) {
        newErrors.body = t('buyer.products.reviewForm.reviewRequired', 'Please write your review.');
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
        <Trans
          i18nKey="buyer.products.reviewForm.signInPrompt"
          defaults="<signin>Sign in</signin> to write a review."
          components={{
            signin: <a href="/login" className="text-blue-600 hover:underline" />,
          }}
        />
      </p>
    );
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <Separator />
      <h3 className="font-medium">
        {t('buyer.products.reviewForm.title', 'Write a review')}
      </h3>
      <StarRating rating={draftRating} interactive onRate={(r) => { setDraftRating(r); setErrors((e) => ({ ...e, rating: undefined })); }} />
      {errors.rating && <p className="text-sm text-red-500">{errors.rating}</p>}
      <Input
        placeholder={t('buyer.products.reviewForm.titlePlaceholder', 'Title (optional)')}
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        maxLength={255}
      />
      <div className="relative">
        <Textarea
          placeholder={t(
            'buyer.products.reviewForm.bodyPlaceholder',
            'Share your experience...',
          )}
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
      <Button onClick={handleReviewSubmit} disabled={isSubmitting || isCheckingEligibility}>
        {isSubmitting
          ? t('buyer.products.actions.submitting', 'Submitting...')
          : t('buyer.products.reviewForm.submit', 'Submit Review')}
      </Button>
    </div>
  );
}
