import { useEffect, useState, useMemo, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
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
import { useAuth } from '@/hooks/useAuth'
import { useCreatePromotion } from '@/hooks/usePromotions'

function getDefaultStartsAt(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function getDefaultExpiresAt(): string {
  const now = new Date()
  const oneMonth = new Date(now)
  oneMonth.setMonth(oneMonth.getMonth() + 1)
  return new Date(oneMonth.getTime() - oneMonth.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function PromotionCreate() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const createPromotion = useCreatePromotion()

  const status = user?.licenseStatus || user?.license_status
  const defaultStartsAt = useMemo(() => getDefaultStartsAt(), [])
  const defaultExpiresAt = useMemo(() => getDefaultExpiresAt(), [])

  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountTypeCode, setDiscountTypeCode] = useState('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [minOrderAmount, setMinOrderAmount] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [startsAt, setStartsAt] = useState(defaultStartsAt)
  const [expiresAt, setExpiresAt] = useState(defaultExpiresAt)
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!code.trim()) newErrors.code = 'Code is required'
    else if (code.length > 50) newErrors.code = 'Code must not exceed 50 characters'

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

    if (!startsAt) newErrors.startsAt = 'Start date is required'
    else if (new Date(startsAt) < new Date(Date.now() - 60000))
      newErrors.startsAt = 'Start date must not be in the past'

    if (!expiresAt) newErrors.expiresAt = 'Expiry date is required'
    else if (startsAt && new Date(expiresAt) <= new Date(startsAt))
      newErrors.expiresAt = 'Expiry date must be after start date'

    if (maxUses && Number(maxUses) < 1) newErrors.maxUses = 'Must be at least 1'

    if (minOrderAmount && Number(minOrderAmount) < 0) newErrors.minOrderAmount = 'Must be 0 or greater'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    createPromotion.mutate(
      {
        code: code.trim(),
        description: description.trim() || undefined,
        discountTypeCode,
        discountValue: Number(discountValue),
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
        maxUses: maxUses ? Number(maxUses) : undefined,
        startsAt: new Date(startsAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        isActive,
      },
      {
        onSuccess: () => {
          toast.success(t('merchant.promotions.saveSuccess'))
          navigate('/merchant/promotions')
        },
        onError: (err: unknown) => {
          const axiosErr = err as { response?: { data?: { message?: string | string[] } }; message?: string }
          const backendMessage = axiosErr?.response?.data?.message
          toast.error(backendMessage ? String(backendMessage) : 'Failed to create promotion')
        },
      },
    )
  }

  return (
    <div className="p-2 lg:p-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t('merchant.promotions.addNew')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">{t('merchant.promotions.form.code')}</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t('merchant.promotions.form.codePlaceholder')}
                maxLength={50}
                className="font-mono"
              />
              {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
              <p className="text-xs text-muted-foreground">
                {t('merchant.promotions.form.codeHelper')}
              </p>
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
              />
            </div>

            {/* Discount Type */}
            <div className="space-y-2">
              <Label>{t('merchant.promotions.form.discountType')}</Label>
              <Select value={discountTypeCode} onValueChange={setDiscountTypeCode}>
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
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/merchant/promotions')}
                disabled={createPromotion.isPending}
              >
                {t('merchant.promotions.cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold"
                disabled={createPromotion.isPending}
              >
                {createPromotion.isPending
                  ? t('merchant.promotions.saving')
                  : t('merchant.promotions.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
