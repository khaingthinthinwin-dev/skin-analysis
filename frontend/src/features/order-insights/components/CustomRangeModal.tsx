import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { countRangeDays, formatRangeLabel, isIsoDate, toIsoDate } from '../utils/dateRangeLabel';

/** Accent of the card metrics, reused for the picked range in the summary line. */
const rangeHighlightClassName = 'font-semibold text-[#7c3aed] oidark:text-primary';

interface CustomRangeModalProps {
  /** Applied range, prefilled when the modal is reopened. */
  from?: string;
  to?: string;
  /** Server-side range error (422 for a missing/backwards range or a future date). */
  error?: string;
  onApply?: (from: string, to: string) => void;
  /** Cancel, the X, Escape and a click on the dimmed backdrop all land here. */
  onClose: () => void;
}

/**
 * Custom range modal of the Revenue Summary period toggle (EL-OI-41).
 *
 * Reuses the shared shadcn Dialog — the same component behind the Merchant Detail
 * modal of the admin Merchants page — so the dimmed backdrop, the centred panel,
 * the focus trap, the page-scroll lock, `role="dialog"`/`aria-modal`, the X close
 * button and Escape/backdrop dismissal all come from that shared component. The
 * dialog body copies that modal's styling: the light-lavender `bg-muted/50` panel
 * (its "Owner Information" block) and the outline + solid purple footer pair.
 *
 * The project ships no calendar library, so the range is entered through two native
 * date inputs — the month grid of the design is not rendered. The parent mounts the
 * modal only while it is open, which seeds the fields from the applied range on
 * every open and drops the drafts when it closes.
 *
 * Picking a value never rewrites the other field, so both failures of the design
 * stay reachable: Apply without both dates and Apply with a start after the end.
 */
export function CustomRangeModal({ from, to, error, onApply, onClose }: CustomRangeModalProps) {
  const { t } = useTranslation();
  const startId = useId();
  const endId = useId();
  const startRef = useRef<HTMLInputElement>(null);
  const [startDate, setStartDate] = useState(() => (isIsoDate(from) ? from : ''));
  const [endDate, setEndDate] = useState(() => (isIsoDate(to) ? to : ''));
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const [serverErrorDismissed, setServerErrorDismissed] = useState(false);

  const todayIso = toIsoDate(new Date());
  // Editing either field clears the validation message and the server error.
  const message = localError ?? (serverErrorDismissed ? undefined : error);
  const clearError = () => {
    setLocalError(undefined);
    setServerErrorDismissed(true);
  };
  const hasStart = isIsoDate(startDate);
  const hasEnd = isIsoDate(endDate);
  // A backwards range is not a range yet: it keeps asking for an end date and the
  // Apply button reports "Start date must be before end date.".
  const rangeLabel = hasStart && hasEnd && startDate <= endDate ? formatRangeLabel(startDate, endDate) : undefined;
  const summaryText = hasStart
    ? t('merchant.revenue.pickEndDate', 'Now pick an end date')
    : hasEnd
      ? t('merchant.revenue.pickStartDate', 'Now pick a start date')
      : t('merchant.revenue.noDatesSelected', 'No dates selected');
  const days = rangeLabel ? countRangeDays(startDate, endDate) : 0;
  const daysWord = days === 1
    ? t('merchant.revenue.dayOne', 'day')
    : t('merchant.revenue.dayOther', 'days');

  const handleApply = () => {
    if (!hasStart || !hasEnd || startDate > todayIso || endDate > todayIso) {
      setLocalError(t('merchant.revenue.selectRangeError', 'Select a start and end date.'));
      return;
    }
    if (startDate > endDate) {
      setLocalError(t('merchant.revenue.startBeforeEndError', 'Start date must be before end date.'));
      return;
    }
    onApply?.(startDate, endDate);
  };

  const labelClassName = 'mb-1.5 block text-xs text-muted-foreground';

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        aria-label={t('merchant.revenue.customRangeTitle', 'Custom range')}
        aria-modal="true"
        className="w-[calc(100%-16px)] max-w-[440px] gap-0 rounded-[14px] p-6 sm:rounded-[14px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          startRef.current?.focus();
        }}
      >
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-[18px] font-bold text-gray-900 oidark:text-foreground">
            {t('merchant.revenue.customRangeTitle', 'Custom range')}
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-gray-500 oidark:text-muted-foreground">
            {t('merchant.revenue.customRangeSubtitle', 'Choose the period to calculate your revenue.')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg bg-muted/50 p-4 min-[480px]:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor={startId} className={labelClassName}>
              {t('merchant.revenue.startDate', 'Start date')}
            </label>
            <Input
              ref={startRef}
              id={startId}
              type="date"
              max={todayIso}
              value={startDate}
              onChange={(event) => {
                clearError();
                setStartDate(event.target.value);
              }}
              className="h-10 bg-white oidark:border-outline-variant oidark:bg-surface-container-lowest oidark:text-foreground oidark:[color-scheme:dark]"
            />
          </div>
          <div className="min-w-0">
            <label htmlFor={endId} className={labelClassName}>
              {t('merchant.revenue.endDate', 'End date')}
            </label>
            <Input
              id={endId}
              type="date"
              max={todayIso}
              min={hasStart ? startDate : undefined}
              value={endDate}
              onChange={(event) => {
                clearError();
                setEndDate(event.target.value);
              }}
              className="h-10 bg-white oidark:border-outline-variant oidark:bg-surface-container-lowest oidark:text-foreground oidark:[color-scheme:dark]"
            />
          </div>
        </div>

        <p className="m-0 mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {rangeLabel
            ? <>
              <span className={rangeHighlightClassName}>{rangeLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{`${days} ${daysWord}`}</span>
            </>
            : <span>{summaryText}</span>}
        </p>

        {message && <p role="alert" className="m-0 mt-1.5 text-[12px] font-medium text-destructive">{message}</p>}

        <DialogFooter className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 sm:space-x-0">
          <Button type="button" variant="outline" onClick={onClose} className="h-[38px] px-4">
            {t('merchant.revenue.cancel', 'Cancel')}
          </Button>
          <Button type="button" onClick={handleApply} className="h-[38px] px-4">
            {t('merchant.revenue.apply', 'Apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
