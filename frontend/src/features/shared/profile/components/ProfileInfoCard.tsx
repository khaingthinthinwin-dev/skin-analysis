import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import type { Profile } from '@/types/profile.types'
import { Mail, Calendar, Shield, FileCheck } from 'lucide-react'

interface ProfileInfoCardProps {
  profile: Profile
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    case 'admin':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case 'merchant':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function ProfileInfoCard({ profile }: ProfileInfoCardProps) {
  const { t } = useTranslation()
  const userRole = profile.role || profile.roleCode || 'buyer'
  const roleDefault = userRole === 'super_admin' ? 'Super Admin' : userRole.charAt(0).toUpperCase() + userRole.slice(1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.info.title', 'Profile Information')}</CardTitle>
        <CardDescription>
          {t('profile.info.description', 'Your account details and information')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar and Name Section */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar || undefined} alt={profile.name} />
            <AvatarFallback className="text-lg">{getInitials(profile.name)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold">{profile.name}</h3>
            <Badge className={getRoleBadgeColor(userRole)}>
              <Shield className="mr-1 h-3 w-3" />
              {t(`roles.${userRole}`, roleDefault)}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Contact Information */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('profile.info.contactInfo', 'Contact Information')}
          </h4>

          <div className="flex items-center space-x-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{t('profile.info.email', 'Email')}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Account Details */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('profile.info.accountDetails', 'Account Details')}
          </h4>

          {userRole === 'merchant' && (
            <div className="flex items-center space-x-3">
              <FileCheck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {t('profile.info.licenseStatus', 'License Status')}
                </p>
                <Badge
                  variant={
                    profile.licenseStatus === 'approved'
                      ? 'default'
                      : profile.licenseStatus === 'rejected'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {profile.licenseStatus === 'approved'
                    ? t('profile.info.licenseApproved', 'Approved')
                    : profile.licenseStatus === 'rejected'
                      ? t('profile.info.licenseRejected', 'Rejected')
                      : t('profile.info.licensePending', 'Pending')}
                </Badge>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{t('profile.info.memberSince', 'Member Since')}</p>
              <p className="text-sm text-muted-foreground">{formatDate(profile.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {t('profile.info.emailVerification', 'Email Verification')}
              </p>
              <Badge variant={profile.emailVerified ? 'default' : 'secondary'}>
                {profile.emailVerified
                  ? t('profile.info.verified', 'Verified')
                  : t('profile.info.notVerified', 'Not Verified')}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
