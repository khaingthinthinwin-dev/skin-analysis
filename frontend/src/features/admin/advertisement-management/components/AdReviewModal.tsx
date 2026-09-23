import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { formatPrice } from '../utils/format'
import { getImageUrl } from '@/lib/image-url'
import type { AdminAdDetail } from '@/types/admin-ad-management'
import { PaymentBadge, StatusBadge, TierBadge } from './badges'
import { PLACEMENT_LABELS, formatDate } from '../utils/labels'

interface AdReviewModalProps {
  open: boolean
  ad?: AdminAdDetail
  isLoading?: boolean
  isReadOnly?: boolean
  isApproving?: boolean
  isRejecting?: boolean
  onApprove: () => void
  onReject: (reason: string) => void
  onClose: () => void
}

const REASON_MAX = 1000

export function AdReviewModal({
  open,
  ad,
  isLoading = false,
  isReadOnly = false,
  isApproving = false,
  isRejecting = false,
  onApprove,
  onReject,
  onClose,
}: AdReviewModalProps) {
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')

  const isPending = ad?.approvalStatus === 'pending'
  const canReject = reason.trim().length > 0 && reason.trim().length <= REASON_MAX

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? 'View Advertisement' : 'Review Advertisement'}</DialogTitle>
          <DialogDescription>
            {ad ? `Advertisement by ${ad.shopName}` : 'Loading advertisement details...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !ad ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-4">
            <section aria-label="Shop information" className="grid gap-2 rounded-md border p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Shop</p>
                <p className="font-medium">{ad.shopName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Placement</p>
                <p className="font-medium">{PLACEMENT_LABELS[ad.placement]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tier</p>
                <TierBadge tier={ad.tier} />
              </div>
            </section>

            <section aria-label="Advertisement preview" className="space-y-3 rounded-md border p-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium">{ad.title}</p>
                <StatusBadge status={ad.approvalStatus} />
              </div>
              <div className="flex max-h-[320px] w-full items-center justify-center overflow-hidden rounded-md bg-secondary/50">
                {ad.imageUrl ? (
                  <img
                    src={getImageUrl(ad.imageUrl)}
                    alt={ad.title}
                    className="max-h-[320px] w-full object-contain"
                  />
                ) : (
                  <span className="px-4 py-16 text-xs text-muted-foreground">No banner image</span>
                )}
              </div>
              {ad.announcementMessage && (
                <div className="rounded-md border bg-secondary/40 px-3 py-2.5">
                  <p className="text-xs font-medium text-muted-foreground">Announcement</p>
                  <p className="mt-0.5 text-sm font-medium">{ad.announcementMessage}</p>
                </div>
              )}
              {ad.content && <p className="text-sm text-muted-foreground">{ad.content}</p>}
              {ad.linkUrl && (
                <a
                  href={ad.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {ad.linkUrl}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Start date</p>
                  <p>{formatDate(ad.startsAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">End date</p>
                  <p>{formatDate(ad.expiresAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p>{ad.feeInfo.durationDays} days</p>
                </div>
              </div>
            </section>

            <section aria-label="Fee and payment" className="space-y-2 rounded-md border p-4">
              <div className="flex items-center justify-between text-sm">
                <span>Daily rate</span>
                <span className="font-medium">{formatPrice(Number(ad.feeInfo.dailyRate))}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Duration</span>
                <span className="font-medium">{ad.feeInfo.durationDays} days</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span>Total fee</span>
                <span className="font-medium">{formatPrice(Number(ad.feeInfo.totalFee))}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Fee paid</span>
                <span className="font-medium">{formatPrice(Number(ad.paymentInfo.amount))}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Payment status</span>
                <PaymentBadge status={ad.paymentInfo.paymentStatus} />
              </div>
              {ad.paymentInfo.paidAt && (
                <p className="text-xs text-muted-foreground">Paid on {formatDate(ad.paymentInfo.paidAt)}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Fee locked at purchase time; later fee setting changes do not affect this advertisement.
              </p>
            </section>

            {!isPending && ad.rejectionReason && (
              <section aria-label="Rejection reason" className="rounded-md border border-red-200 bg-red-50/50 p-4 text-sm">
                <p className="text-xs font-medium text-destructive">Rejection reason</p>
                <p className="mt-1">{ad.rejectionReason}</p>
              </section>
            )}

            {isPending && !isReadOnly && showReject && (
              <section aria-label="Rejection reason input" className="space-y-2 rounded-md border border-red-200 p-4">
                <label htmlFor="rejection-reason" className="text-sm font-medium">
                  Rejection reason <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="rejection-reason"
                  value={reason}
                  maxLength={REASON_MAX}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe why this advertisement is rejected..."
                  rows={4}
                  className={reason.length > REASON_MAX ? 'border-destructive' : ''}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {reason.length}/{REASON_MAX}
                </p>
                {reason.trim().length === 0 && (
                  <p role="alert" className="text-sm text-destructive">
                    Rejection reason is required.
                  </p>
                )}
              </section>
            )}
          </div>
        )}

        <DialogFooter>
          {isPending && !isReadOnly ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={isApproving || isRejecting}>
                Cancel
              </Button>
              {showReject ? (
                <>
                  <Button variant="ghost" onClick={() => setShowReject(false)} disabled={isRejecting}>
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={!canReject || isApproving}
                    onClick={() => onReject(reason.trim())}
                  >
                    {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => setShowReject(true)}
                    disabled={isApproving}
                  >
                    Reject
                  </Button>
                  <Button onClick={onApprove} disabled={isRejecting}>
                    {isApproving ? 'Approving...' : 'Approve'}
                  </Button>
                </>
              )}
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}