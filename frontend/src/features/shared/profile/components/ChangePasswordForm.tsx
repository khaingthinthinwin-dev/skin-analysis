import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useProfile } from '../hooks/useProfile'
import { changePasswordSchema, type ChangePasswordFormData } from '@/schemas/profile.schema'
import { PasswordStrengthIndicator } from '@/features/auth/components/PasswordStrengthIndicator'
import { toast } from 'sonner'

export function ChangePasswordForm() {
  const { t } = useTranslation()
  const { changePassword } = useProfile()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const newPassword = form.watch('newPassword')

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      toast.success(t('profile.password.success', 'Password changed successfully'))
      form.reset()
    } catch (error) {
      toast.error(t('profile.password.error', 'Failed to change password'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.password.title', 'Change Password')}</CardTitle>
        <CardDescription>
          {t('profile.password.description', 'Update your password to keep your account secure')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.password.current', 'Current Password')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder={t('profile.password.currentPlaceholder', 'Enter your current password')}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.password.new', 'New Password')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder={t('profile.password.newPlaceholder', 'Create a new password')}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t('profile.password.newDescription', 'Must be at least 8 characters with uppercase, lowercase, number, and special character')}
                  </FormDescription>
                  <PasswordStrengthIndicator password={newPassword || ''} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.password.confirm', 'Confirm New Password')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder={t('profile.password.confirmPlaceholder', 'Confirm your new password')}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('profile.password.saving', 'Changing...')}
                </>
              ) : (
                t('profile.password.save', 'Change Password')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
