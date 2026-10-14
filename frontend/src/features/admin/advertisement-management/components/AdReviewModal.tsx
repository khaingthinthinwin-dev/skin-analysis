import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { formatPrice } from '@/lib/format'
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
  const { t } = useTranslation()
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')

  const isPending = ad?.approvalStatus === 'pending'
  const canReject = reason.trim().length > 0 && reason.trim().length <= REASON_MAX

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isReadOnly
              ? t('admin.ads.reviewModal.viewTitle', 'View Advertisement')
              : t('admin.ads.reviewModal.reviewTitle', 'Review Advertisement')}
          </DialogTitle>
          <DialogDescription>
            {ad
              ? t('admin.ads.reviewModal.advertisementBy', 'Advertisement by {{shopName}}', { shopName: ad.shopName })
              : t('admin.ads.reviewModal.loadingDetails', 'Loading advertisement details...')}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !ad ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('common.loading', 'Loading...')}
          </p>
        ) : (
          <div className="space-y-4">
            <section aria-label={t('admin.ads.reviewModal.shopInformation', 'Shop information')} className="grid gap-2 rounded-md border p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">{t('admin.ads.reviewModal.shop', 'Shop')}</p>
                <p className="font-medium">{ad.shopName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('admin.ads.reviewModal.placement', 'Placement')}</p>
                <p className="font-medium">{t(`admin.ads.placement.${ad.placement}`, PLACEMENT_LABELS[ad.placement])}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('admin.ads.reviewModal.tier', 'Tier')}</p>
                <TierBadge tier={ad.tier} />
              </div>
            </section>

            <section aria-label={t('admin.ads.reviewModal.preview', 'Advertisement preview')} className="space-y-3 rounded-md border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
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
                  <span className="px-4 py-16 text-xs text-muted-foreground">
                    {t('admin.ads.reviewModal.noBannerImage', 'No banner image')}
                  </span>
                )}
              </div>
              {ad.announcementMessage && (
                <div className="rounded-md border bg-secondary/40 px-3 py-2.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('admin.ads.reviewModal.announcement', 'Announcement')}
                  </p>
                  <p className="mt-0.5 text-sm font-medium">{ad.announcementMessage}</p>
                </div>
              )}
              {ad.content && <p className="text-sm text-muted-foreground">{ad.content}</p>}
              {ad.sku && (
                <span className="inline-flex items-center gap-1 text-sm text-primary">
                  {t('admin.ads.reviewModal.skuLabel', 'SKU: {{sku}}', { sku: ad.sku })}
                </span>
              )}
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t('admin.ads.reviewModal.startDate', 'Start date')}</p>
                  <p>{formatDate(ad.startsAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('admin.ads.reviewModal.endDate', 'End date')}</p>
                  <p>{formatDate(ad.expiresAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('admin.ads.reviewModal.duration', 'Duration')}</p>
                  <p>{t('admin.ads.reviewModal.durationDays', '{{count}} days', { count: ad.feeInfo.durationDays })}</p>
                </div>
              </div>
            </section>

            <section aria-label={t('admin.ads.reviewModal.feeAndPayment', 'Fee and payment')} className="space-y-2 rounded-md border p-4">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                <span>{t('admin.ads.reviewModal.dailyRate', 'Daily rate')}</span>
                <span className="font-medium">{formatPrice(Number(ad.feeInfo.dailyRate))}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                <span>{t('admin.ads.reviewModal.duration', 'Duration')}</span>
                <span className="font-medium">{t('admin.ads.reviewModal.durationDays', '{{count}} days', { count: ad.feeInfo.durationDays })}</span>
              </div>
              <Separator />
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                <span>{t('admin.ads.reviewModal.totalFee', 'Total fee')}</span>
                <span className="font-medium">{formatPrice(Number(ad.feeInfo.totalFee))}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                <span>{t('admin.ads.reviewModal.feePaid', 'Fee paid')}</span>
                <span className="font-medium">{formatPrice(Number(ad.paymentInfo.amount))}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                <span>{t('admin.ads.reviewModal.paymentStatus', 'Payment status')}</span>
                <PaymentBadge status={ad.paymentInfo.paymentStatus} />
              </div>
              {ad.paymentInfo.paidAt && (
                <p className="text-xs text-muted-foreground">
                  {t('admin.ads.reviewModal.paidOn', 'Paid on {{date}}', { date: formatDate(ad.paymentInfo.paidAt) })}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('admin.ads.reviewModal.feeLockedNotice', 'Fee locked at purchase time; later fee setting changes do not affect this advertisement.')}
              </p>
            </section>

            {!isPending && ad.rejectionReason && (
              <section aria-label={t('admin.ads.reviewModal.rejectionReason', 'Rejection reason')} className="rounded-md border border-red-200 bg-red-50/50 p-4 text-sm">
                <p className="text-xs font-medium text-destructive">{t('admin.ads.reviewModal.rejectionReason', 'Rejection reason')}</p>
                <p className="mt-1">{ad.rejectionReason}</p>
              </section>
            )}

            {isPending && !isReadOnly && showReject && (
              <section aria-label={t('admin.ads.reviewModal.rejectionInput', 'Rejection reason input')} className="space-y-2 rounded-md border border-red-200 p-4">
                <label htmlFor="rejection-reason" className="text-sm font-medium">
                  {t('admin.ads.reviewModal.rejectionReason', 'Rejection reason')} <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="rejection-reason"
                  value={reason}
                  maxLength={REASON_MAX}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('admin.ads.reviewModal.rejectionPlaceholder', 'Describe why this advertisement is rejected...')}
                  rows={4}
                  className={reason.length > REASON_MAX ? 'border-destructive' : ''}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {reason.length}/{REASON_MAX}
                </p>
                {reason.trim().length === 0 && (
                  <p role="alert" className="text-sm text-destructive">
                    {t('admin.ads.reviewModal.rejectionRequired', 'Rejection reason is required.')}
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
                {t('common.cancel', 'Cancel')}
              </Button>
              {showReject ? (
                <>
                  <Button variant="ghost" onClick={() => setShowReject(false)} disabled={isRejecting}>
                    {t('common.back', 'Back')}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={!canReject || isApproving}
                    onClick={() => onReject(reason.trim())}
                  >
                    {isRejecting
                      ? t('admin.ads.reviewModal.rejecting', 'Rejecting...')
                      : t('admin.ads.reviewModal.confirmReject', 'Confirm Reject')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => setShowReject(true)}
                    disabled={isApproving}
                  >
                    {t('admin.ads.reviewModal.reject', 'Reject')}
                  </Button>
                  <Button onClick={onApprove} disabled={isRejecting}>
                    {isApproving
                      ? t('admin.ads.reviewModal.approving', 'Approving...')
                      : t('admin.ads.reviewModal.approve', 'Approve')}
                  </Button>
                </>
              )}
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>
              {t('common.close', 'Close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}