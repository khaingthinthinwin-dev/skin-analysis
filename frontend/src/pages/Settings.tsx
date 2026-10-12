import { useTranslation } from 'react-i18next'
import { Settings as SettingsIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LanguageToggle } from '@/components/common/LanguageToggle'

export default function Settings() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('common.settings')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle', 'Customize your experience')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            {t('settings.cardTitle', 'Preferences')}
          </CardTitle>
          <CardDescription>{t('settings.cardDesc', 'Manage your app preferences')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('settings.themeLabel', 'Theme')}</p>
              <p className="text-sm text-muted-foreground">{t('settings.themeDesc', 'Select your preferred theme')}</p>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('settings.languageLabel', 'Language')}</p>
              <p className="text-sm text-muted-foreground">{t('settings.languageDesc', 'Choose your preferred language')}</p>
            </div>
            <LanguageToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
