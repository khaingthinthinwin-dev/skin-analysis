import { useState } from 'react';
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
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'fake', label: 'Fake review' },
  { value: 'other', label: 'Other' },
] as const;

interface ReviewReportDialogProps {
  reviewId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewReportDialog({ reviewId, open, onOpenChange }: ReviewReportDialogProps) {
  const report = useReportReview(reviewId);
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');

  const canSubmit = !!reason && !report.isPending;

  const handleSubmit = () => {
    if (!reason) return;
    report.mutate(
      { reason: reason as 'spam' | 'inappropriate' | 'fake' | 'other', description },
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
          <DialogTitle>Report Review</DialogTitle>
          <DialogDescription>
            Let us know why you are reporting this review. Reports are reviewed by our moderation
            team.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
          {REASONS.map((r) => (
            <div key={r.value} className="flex items-center gap-2">
              <RadioGroupItem value={r.value} id={`reason-${r.value}`} />
              <Label htmlFor={`reason-${r.value}`}>{r.label}</Label>
            </div>
          ))}
        </RadioGroup>

        <Textarea
          placeholder="Provide additional details... (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={3}
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={report.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {report.isPending ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
