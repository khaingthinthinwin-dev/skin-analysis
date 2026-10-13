import { LayoutGrid, List } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { ViewMode } from '@/types/search.types'

interface ViewToggleProps {
  view: ViewMode
  onChange: (view: ViewMode) => void
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  const { t } = useTranslation()
  return (
    <div role="group" aria-label={t('buyer.search.viewMode', 'View mode')} className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
      <Button
        variant={view === 'grid' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        aria-label={t('buyer.search.gridView', 'Grid view')}
        aria-pressed={view === 'grid'}
        onClick={() => onChange('grid')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={view === 'list' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        aria-label={t('buyer.search.listView', 'List view')}
        aria-pressed={view === 'list'}
        onClick={() => onChange('list')}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )
}
