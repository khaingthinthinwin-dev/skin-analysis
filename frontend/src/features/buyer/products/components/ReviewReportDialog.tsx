import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useReportReview } from '../hooks/useProductDetail';

const REASONS = [
  { value: 'spam', key: 'buyer.products.report.reasonSpam', fallback: 'Spam' },
  {
    value: 'inappropriate',
    key: 'buyer.products.report.reasonInappropriate',
    fallback: 'Inappropriate content',
  },
  { value: 'fake', key: 'buyer.products.report.reasonFake', fallback: 'Fake review' },
  { value: 'other', key: 'buyer.products.report.reasonOther', fallback: 'Other' },
] as const;

interface ReviewReportDialogProps {
  reviewId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewReportDialog({ reviewId, open, onOpenChange }: ReviewReportDialogProps) {
  const { t } = useTranslation();
  const report = useReportReview(reviewId);
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const isDescriptionTooLong = description.length > 1000;

  const canSubmit = !!reason && !report.isPending && !isDescriptionTooLong;

  const handleSubmit = () => {
    if (!reason || isDescriptionTooLong) return;
    report.mutate(
      { reason: reason as 'spam' | 'inappropriate' | 'fake' | 'other', detail: description },
      {
        onSettled: () => {
          onOpenChange(false);
          setReason('');
          setDescription('');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('buyer.products.report.title', 'Report Review')}</DialogTitle>
          <DialogDescription>
            {t(
              'buyer.products.report.description',
              'Let us know why you are reporting this review. Reports are reviewed by our moderation team.',
            )}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
          {REASONS.map((r) => (
            <div key={r.value} className="flex items-center gap-2">
              <RadioGroupItem value={r.value} id={`reason-${r.value}`} />
              <Label htmlFor={`reason-${r.value}`}>{t(r.key, r.fallback)}</Label>
            </div>
          ))}
        </RadioGroup>

        <Textarea
          placeholder={t(
            'buyer.products.report.detailsPlaceholder',
            'Provide additional details... (optional)',
          )}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={isDescriptionTooLong}
          aria-describedby={isDescriptionTooLong ? 'report-details-error' : undefined}
          rows={3}
        />
        {isDescriptionTooLong && (
          <p id="report-details-error" className="text-sm text-red-500">
            {t(
              'buyer.products.report.detailsTooLong',
              'Details must be 1000 characters or fewer.',
            )}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={report.isPending}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {report.isPending
              ? t('buyer.products.actions.submitting', 'Submitting...')
              : t('buyer.products.report.submit', 'Submit Report')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
