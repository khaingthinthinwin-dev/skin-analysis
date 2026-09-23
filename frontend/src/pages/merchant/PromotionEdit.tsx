import { useEffect, useState, useMemo, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePromotion, useUpdatePromotion } from '@/hooks/usePromotions'
import type { Promotion } from '@/types/promotion.types'

interface FormState {
  description: string
  discountTypeCode: string
  discountValue: string
  minOrderAmount: string
  maxUses: string
  startsAt: string
  expiresAt: string
  isActive: boolean
}

function utcToLocalDatetime(isoString: string): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function promoToForm(promo: Promotion): FormState {
  const discountTypeCode =
    promo.discountTypeCode ||
    (promo as unknown as { discountType?: string }).discountType ||
    'percentage'

  return {
    description: promo.description || '',
    discountTypeCode,
    discountValue: promo.discountValue != null ? promo.discountValue.toString() : '',
    minOrderAmount: promo.minOrderAmount != null ? promo.minOrderAmount.toString() : '',
    maxUses: promo.maxUses != null ? promo.maxUses.toString() : '',
    startsAt: utcToLocalDatetime(promo.startsAt),
    expiresAt: utcToLocalDatetime(promo.expiresAt),
    isActive: promo.isActive ?? true,
  }
}

function PromotionForm({
  promotion,
  onNavigateBack,
}: {
  promotion: Promotion
  onNavigateBack: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const updatePromotion = useUpdatePromotion()

  const initial = useMemo(() => promoToForm(promotion), [promotion])

  const [description, setDescription] = useState(initial.description)
  const [discountTypeCode, setDiscountTypeCode] = useState(initial.discountTypeCode)
  const [discountValue, setDiscountValue] = useState(initial.discountValue)
  const [minOrderAmount, setMinOrderAmount] = useState(initial.minOrderAmount)
  const [maxUses, setMaxUses] = useState(initial.maxUses)
  const [startsAt, setStartsAt] = useState(initial.startsAt)
  const [expiresAt, setExpiresAt] = useState(initial.expiresAt)
  const [isActive, setIsActive] = useState(initial.isActive)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isUsed = (promotion.usedCount ?? 0) > 0

  const validate = (): boolean => {
    if (isUsed) return false
    const newErrors: Record<string, string> = {}

    if (!discountValue) newErrors.discountValue = 'Discount value is required'
    else if (Number(discountValue) <= 0) newErrors.discountValue = 'Must be greater than 0'
    else if (discountTypeCode === 'percentage' && Number(discountValue) > 100)
      newErrors.discountValue = 'Percentage must not exceed 100'
    else if (
      discountTypeCode === 'fixed' &&
      minOrderAmount &&
      Number(discountValue) >= Number(minOrderAmount)
    )
      newErrors.discountValue = 'Fixed discount cannot be equal to or greater than minimum order amount'

    if (!startsAt) {
      newErrors.startsAt = 'Start date is required'
    } else if (
      startsAt !== initial.startsAt &&
      new Date(startsAt) < new Date(Date.now() - 60000)
    ) {
      newErrors.startsAt = 'Start date must not be in the past'
    }

    if (!expiresAt) {
      newErrors.expiresAt = 'Expiry date is required'
    } else if (startsAt && new Date(expiresAt) <= new Date(startsAt)) {
      newErrors.expiresAt = 'Expiry date must be after start date'
    }

    if (maxUses && Number(maxUses) < 1) newErrors.maxUses = 'Must be at least 1'

    if (minOrderAmount && Number(minOrderAmount) < 0) newErrors.minOrderAmount = 'Must be 0 or greater'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (isUsed || !validate()) return

    updatePromotion.mutate(
      {
        id: promotion.id,
        data: {
          description: description.trim() || undefined,
          discountTypeCode,
          discountValue: Number(discountValue),
          minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
          maxUses: maxUses ? Number(maxUses) : undefined,
          startsAt: new Date(startsAt).toISOString(),
          expiresAt: new Date(expiresAt).toISOString(),
          isActive,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('merchant.promotions.saveSuccess'))
          navigate('/merchant/promotions')
        },
        onError: (err: unknown) => {
          const axiosErr = err as { response?: { data?: { message?: string | string[] } }; message?: string }
          const backendMessage = axiosErr?.response?.data?.message
          toast.error(backendMessage ? String(backendMessage) : 'Failed to update promotion')
        },
      },
    )
  }

  return (
    <div className="p-2 lg:p-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t('merchant.promotions.update')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isUsed && (
            <div className="mb-6 flex items-center gap-2 p-3 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{t('merchant.promotions.usedRestriction')}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Code (read-only) */}
            <div className="space-y-2">
              <Label>{t('merchant.promotions.form.code')}</Label>
              <Input
                value={promotion.code}
                disabled
                className="font-mono bg-muted"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('merchant.promotions.form.description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('merchant.promotions.form.descriptionPlaceholder')}
                maxLength={500}
                rows={3}
                disabled={isUsed}
              />
            </div>

            {/* Discount Type */}
            <div className="space-y-2">
              <Label>{t('merchant.promotions.form.discountType')}</Label>
              <Select value={discountTypeCode} onValueChange={setDiscountTypeCode} disabled={isUsed}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t('merchant.promotions.form.percentage')}</SelectItem>
                  <SelectItem value="fixed">{t('merchant.promotions.form.fixed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discount Value */}
            <div className="space-y-2">
              <Label htmlFor="discountValue">{t('merchant.promotions.form.discountValue')}</Label>
              <Input
                id="discountValue"
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={t('merchant.promotions.form.discountValuePlaceholder')}
                min="0.01"
                step="0.01"
                disabled={isUsed}
              />
              {errors.discountValue && (
                <p className="text-sm text-destructive">{errors.discountValue}</p>
              )}
            </div>

            {/* Min Order Amount */}
            <div className="space-y-2">
              <Label htmlFor="minOrderAmount">{t('merchant.promotions.form.minOrderAmount')}</Label>
              <Input
                id="minOrderAmount"
                type="number"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                placeholder={t('merchant.promotions.form.minOrderAmountPlaceholder')}
                min="0"
                step="100"
                disabled={isUsed}
              />
              {errors.minOrderAmount && (
                <p className="text-sm text-destructive">{errors.minOrderAmount}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('merchant.promotions.form.minOrderAmountHelper')}
              </p>
            </div>

            {/* Max Uses */}
            <div className="space-y-2">
              <Label htmlFor="maxUses">{t('merchant.promotions.form.maxUses')}</Label>
              <Input
                id="maxUses"
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder={t('merchant.promotions.form.maxUsesPlaceholder')}
                min="1"
                disabled={isUsed}
              />
              {errors.maxUses && <p className="text-sm text-destructive">{errors.maxUses}</p>}
              <p className="text-xs text-muted-foreground">
                {t('merchant.promotions.form.maxUsesHelper')}
              </p>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startsAt">{t('merchant.promotions.form.startsAt')}</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  disabled={isUsed}
                />
                {errors.startsAt && (
                  <p className="text-sm text-destructive">{errors.startsAt}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">{t('merchant.promotions.form.expiresAt')}</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  disabled={isUsed}
                />
                {errors.expiresAt && (
                  <p className="text-sm text-destructive">{errors.expiresAt}</p>
                )}
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between rounded-lg border border-border/80 p-4">
              <div className="space-y-0.5">
                <Label>{t('merchant.promotions.form.isActive')}</Label>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} disabled={isUsed} />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
              <Button
                type="button"
                variant="outline"
                onClick={onNavigateBack}
                disabled={updatePromotion.isPending}
              >
                {t('merchant.promotions.cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold"
                disabled={updatePromotion.isPending || isUsed}
              >
                {updatePromotion.isPending
                  ? t('merchant.promotions.saving')
                  : t('merchant.promotions.update')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PromotionEdit() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const status = user?.licenseStatus || user?.license_status

  const { data: promotion, isLoading: isLoadingPromo } = usePromotion(id || '')

  useEffect(() => {
    if (status === 'pending') {
      toast.error(t('merchant.promotions.pendingBanner'))
      navigate('/merchant/promotions', { replace: true })
    }
    if (status === 'rejected') {
      toast.error(t('merchant.promotions.rejectedBanner'))
      navigate('/merchant/promotions', { replace: true })
    }
  }, [status, navigate, t])

  if (status === 'pending' || status === 'rejected') return null

  if (isLoadingPromo) {
    return <LoadingSpinner className="min-h-[400px]" />
  }

  if (!promotion) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">{t('merchant.promotions.notFound')}</p>
          <Button className="mt-4" onClick={() => navigate('/merchant/promotions')}>
            Back to Promotions
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <PromotionForm
      key={promotion.id}
      promotion={promotion}
      onNavigateBack={() => navigate('/merchant/promotions')}
    />
  )
}
