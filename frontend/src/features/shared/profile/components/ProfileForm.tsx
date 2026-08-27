import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
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
import { updateProfileSchema, type UpdateProfileFormData } from '@/schemas/profile.schema'
import { toast } from 'sonner'
import type { Profile } from '@/types/profile.types'

interface ProfileFormProps {
  profile: Profile
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const { t } = useTranslation()
  const { updateProfile } = useProfile()

  const form = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: profile.name || '',
      phone: profile.phone || '',
      avatar: profile.avatar || '',
    },
  })

  const onSubmit = async (data: UpdateProfileFormData) => {
    try {
      await updateProfile.mutateAsync(data)
      toast.success(t('profile.form.success', 'Profile updated successfully'))
    } catch {
      toast.error(t('profile.form.error', 'Failed to update profile'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.form.title', 'Edit Profile')}</CardTitle>
        <CardDescription>
          {t('profile.form.description', 'Update your personal information')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.form.name', 'Full Name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('profile.form.namePlaceholder', 'Enter your name')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('profile.form.nameDescription', 'Your name as it appears on your account')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.form.phone', 'Phone Number')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('profile.form.phonePlaceholder', '+1 234 567 890')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('profile.form.phoneDescription', 'Optional - for account recovery')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.form.avatarUrl', 'Avatar URL')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('profile.form.avatarUrlPlaceholder', 'https://example.com/avatar.jpg')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('profile.form.avatarUrlDescription', 'URL to your profile picture')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('profile.form.saving', 'Saving...')}
                </>
              ) : (
                t('profile.form.save', 'Save Changes')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
