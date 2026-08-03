import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <h2 className="text-2xl font-bold">Page Not Found</h2>
      <p className="text-center text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button asChild>
        <Link to="/">
          <Home className="mr-2 h-4 w-4" />
          {t('common.home')}
        </Link>
      </Button>
    </div>
  )
}
