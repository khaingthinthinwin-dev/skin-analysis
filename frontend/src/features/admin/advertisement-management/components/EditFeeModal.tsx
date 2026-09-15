import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatPrice } from '@/lib/format'
import type { AdminAdFeeSetting, EditFeeSettingInput } from '@/types/admin-ad-management'
import { TierBadge } from './badges'
import { PLACEMENT_LABELS, todayIso } from '../utils/labels'

const editFeeFormSchema = z.object({
  daily_rate: z
    .string({ message: 'Daily rate must be greater than 0' })
    .refine((v) => Number(v) > 0, 'Daily rate must be greater than 0'),
  duration_days: z
    .string({ message: 'Duration must be at least 1 day' })
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Duration must be at least 1 day'),
  max_ads: z
    .string({ message: 'Max ads must be at least 1' })
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Max ads must be at least 1'),
  effective_from: z
    .string({ message: 'Effective date is required' })
    .refine((v) => !isNaN(Date.parse(v)), 'Effective date is required'),
  change_reason: z
    .string({ message: 'Change reason is required' })
    .min(1, 'Change reason is required')
    .max(1000, 'Change reason must not exceed 1000 characters'),
})

type EditFeeFormValues = z.infer<typeof editFeeFormSchema>

interface EditFeeModalProps {
  open: boolean
  feeSetting: AdminAdFeeSetting | null
  isLoading?: boolean
  onSubmit: (id: string, input: EditFeeSettingInput) => void
  onClose: () => void
}

export function EditFeeModal({
  open,
  feeSetting,
  isLoading = false,
  onSubmit,
  onClose,
}: EditFeeModalProps) {
  const form = useForm<EditFeeFormValues>({
    resolver: zodResolver(editFeeFormSchema),
    defaultValues: feeSetting
      ? {
          daily_rate: String(Number(feeSetting.dailyRate)),
          duration_days: String(feeSetting.durationDays),
          max_ads: String(feeSetting.maxAds),
          effective_from: todayIso(),
          change_reason: '',
        }
      : {
          daily_rate: '',
          duration_days: '',
          max_ads: '',
          effective_from: todayIso(),
          change_reason: '',
        },
  })

  const dailyRate = Number(form.watch('daily_rate') || 0)
  const durationDays = Number(form.watch('duration_days') || 0)
  const totalFeePreview = dailyRate * durationDays

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Fee Setting</DialogTitle>
          <DialogDescription>
            {feeSetting
              ? `${PLACEMENT_LABELS[feeSetting.placement]} - ${feeSetting.tier}`
              : 'Edit fee setting details.'}
          </DialogDescription>
        </DialogHeader>
        {feeSetting && (
          <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium">{PLACEMENT_LABELS[feeSetting.placement]}</span>
            <TierBadge tier={feeSetting.tier} />
            <span className="ml-auto text-xs text-muted-foreground">
              Current total fee: {formatPrice(Number(feeSetting.totalFee))}
            </span>
          </div>
        )}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => {
              if (feeSetting)
                onSubmit(feeSetting.id, {
                  daily_rate: Number(values.daily_rate),
                  duration_days: Number(values.duration_days),
                  max_ads: Number(values.max_ads),
                  effective_from: values.effective_from,
                  change_reason: values.change_reason,
                })
            })}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="daily_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily rate</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (days)</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="max_ads"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max ads</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3 text-sm">
              <span>Total fee (Daily rate x Duration)</span>
              <span className="font-semibold">{formatPrice(totalFeePreview)}</span>
            </div>

            <FormField
              control={form.control}
              name="effective_from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective from</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="change_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Change reason</FormLabel>
                  <FormControl>
                    <Textarea rows={3} maxLength={1000} placeholder="Why is this fee setting changed?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}