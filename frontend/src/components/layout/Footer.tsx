import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold">Cosmetics Finder</span>
          </div>
          <p className="text-sm text-muted-foreground">{t('footer.copyright')}</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <a href="/privacy" className="hover:text-primary transition-colors">
              {t('footer.privacy')}
            </a>
            <a href="/terms" className="hover:text-primary transition-colors">
              {t('footer.terms')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
