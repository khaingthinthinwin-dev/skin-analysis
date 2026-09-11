import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ViewMode } from '@/types/search.types'

interface ViewToggleProps {
  view: ViewMode
  onChange: (view: ViewMode) => void
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div role="group" aria-label="View mode" className="flex items-center gap-1 rounded-md border p-0.5">
      <Button
        variant={view === 'grid' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        aria-label="Grid view"
        aria-pressed={view === 'grid'}
        onClick={() => onChange('grid')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={view === 'list' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        aria-label="List view"
        aria-pressed={view === 'list'}
        onClick={() => onChange('list')}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )
}
