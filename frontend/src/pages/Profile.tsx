import { useTranslation } from 'react-i18next'
import { User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

export default function Profile() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('common.profile')}</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <p className="text-muted-foreground">{user?.name || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-muted-foreground">{user?.email || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <p className="text-muted-foreground capitalize">{user?.role || 'Not set'}</p>
            </div>
            {user?.role === 'merchant' && (
              <div>
                <label className="text-sm font-medium">License Status</label>
                <p className="mt-1">
                  {user?.licenseStatus ? (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.licenseStatus === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : user.licenseStatus === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}>
                      {user.licenseStatus === 'approved'
                        ? 'Approved'
                        : user.licenseStatus === 'rejected'
                          ? 'Rejected'
                          : 'Pending'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Member Since</label>
              <p className="text-muted-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not set'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
