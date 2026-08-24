import { useTranslation } from 'react-i18next'
import { User } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProfileInfoCard } from '@/features/shared/profile/components/ProfileInfoCard'
import { ProfileForm } from '@/features/shared/profile/components/ProfileForm'
import { ChangePasswordForm } from '@/features/shared/profile/components/ChangePasswordForm'
import { useProfile } from '@/features/shared/profile/hooks/useProfile'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function Profile() {
  const { t } = useTranslation()
  const { profile, isLoading, error } = useProfile()

  if (isLoading) {
    return <LoadingSpinner className="min-h-[400px]" />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t('profile.error.title', 'Error')}</AlertTitle>
        <AlertDescription>
          {t('profile.error.loadFailed', 'Failed to load profile information. Please try again.')}
        </AlertDescription>
      </Alert>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="h-8 w-8" />
          {t('profile.title', 'My Profile')}
        </h1>
        <p className="text-muted-foreground">
          {t('profile.description', 'Manage your account settings and preferences')}
        </p>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">
            {t('profile.tabs.info', 'Profile Info')}
          </TabsTrigger>
          <TabsTrigger value="edit">
            {t('profile.tabs.edit', 'Edit Profile')}
          </TabsTrigger>
          <TabsTrigger value="password">
            {t('profile.tabs.password', 'Change Password')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <ProfileInfoCard profile={profile} />
        </TabsContent>

        <TabsContent value="edit" className="space-y-6">
          <ProfileForm profile={profile} />
        </TabsContent>

        <TabsContent value="password" className="space-y-6">
          <ChangePasswordForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
