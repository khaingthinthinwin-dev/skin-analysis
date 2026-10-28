import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCreateReview, useCanReview } from '../hooks/useProductDetail';
import { AccountDeactivatedAlertDialog } from '@/components/buyer/AccountDeactivatedAlertDialog';
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
  const [errors, setErrors] = useState<{
    rating?: string;
    title?: string;
    body?: string;
    submit?: string;
  }>({});
  const [deactivatedAlertOpen, setDeactivatedAlertOpen] = useState(false);

  const isBuyer = user?.role === 'buyer';
  const isDeactivated =
    user?.isActive === false ||
    user?.is_active === false ||
    user?.status === 'deactivated' ||
    user?.status === 'inactive';
  const canReview = canReviewData?.canReview ?? false;

  const validate = (): boolean => {
    const newErrors: {
      rating?: string;
      title?: string;
      body?: string;
      submit?: string;
    } = {};
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
      if (draftTitle.length > 255) {
        newErrors.title = t(
          'buyer.products.reviewForm.titleTooLong',
          'Title must be 255 characters or fewer.',
        );
      }
      if (!draftBody.trim()) {
        newErrors.body = t('buyer.products.reviewForm.reviewRequired', 'Please write your review.');
      } else if (draftBody.length > 5000) {
        newErrors.body = t(
          'buyer.products.reviewForm.bodyTooLong',
          'Review must be 5000 characters or fewer.',
        );
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReviewSubmit = () => {
    if (isDeactivated) {
      setDeactivatedAlertOpen(true);
      return;
    }
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
        aria-invalid={Boolean(errors.title)}
        aria-describedby={errors.title ? 'review-title-error' : undefined}
        onChange={(e) => {
          const value = e.target.value;
          setDraftTitle(value);
          setErrors((current) => ({
            ...current,
            title: value.length > 255
              ? t('buyer.products.reviewForm.titleTooLong', 'Title must be 255 characters or fewer.')
              : undefined,
          }));
        }}
      />
      {errors.title && (
        <p id="review-title-error" className="text-sm text-red-500">{errors.title}</p>
      )}
      <div className="relative">
        <Textarea
          placeholder={t(
            'buyer.products.reviewForm.bodyPlaceholder',
            'Share your experience...',
          )}
          value={draftBody}
          aria-invalid={Boolean(errors.body)}
          aria-describedby={errors.body ? 'review-body-error' : undefined}
          onChange={(e) => {
            const value = e.target.value;
            setDraftBody(value);
            setErrors((current) => ({
              ...current,
              body: value.length > 5000
                ? t('buyer.products.reviewForm.bodyTooLong', 'Review must be 5000 characters or fewer.')
                : undefined,
            }));
          }}
          rows={4}
        />
        <span
          aria-live="polite"
          className={`absolute bottom-2 right-2 text-xs ${
            draftBody.length > 5000 ? 'text-red-500' : 'text-muted-foreground'
          }`}
        >
          {draftBody.length}/5000
        </span>
      </div>
      {errors.body && (
        <p id="review-body-error" className="text-sm text-red-500">{errors.body}</p>
      )}
      {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}
      <Button onClick={handleReviewSubmit} disabled={isSubmitting || isCheckingEligibility}>
        {isSubmitting
          ? t('buyer.products.actions.submitting', 'Submitting...')
          : t('buyer.products.reviewForm.submit', 'Submit Review')}
      </Button>
      <AccountDeactivatedAlertDialog
        open={deactivatedAlertOpen}
        onOpenChange={setDeactivatedAlertOpen}
        feature="reviews"
      />
    </div>
  );
}
