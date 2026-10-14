import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

interface BulkActionsBarProps {
  selectedIds: string[]
  onBulkActivate: (ids: string[]) => void
  onBulkDeactivate: (ids: string[]) => void
  onBulkDelete: (ids: string[]) => void
  onClearSelection: () => void
  className?: string
}

export function BulkActionsBar({
  selectedIds,
  onBulkActivate,
  onBulkDeactivate,
  onBulkDelete,
  onClearSelection,
  className,
}: BulkActionsBarProps) {
  const { t } = useTranslation()
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  if (selectedIds.length === 0) return null

  return (
    <>
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2.5',
          className,
        )}
      >
        <Package className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
      {t('merchant.products.bulk.selected', { count: selectedIds.length })}
        </span>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
      <Button variant="outline" size="sm" onClick={() => onBulkActivate(selectedIds)}>
        {t('merchant.products.bulk.activate')}
      </Button>
      <Button variant="outline" size="sm" onClick={() => onBulkDeactivate(selectedIds)}>
        {t('merchant.products.bulk.deactivate')}
      </Button>
      <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
        {t('common.delete')}
      </Button>
      <Button variant="ghost" size="sm" onClick={onClearSelection}>
        {t('common.clear')}
      </Button>
        </div>
      </div>

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={() => {
          onBulkDelete(selectedIds)
          setBulkDeleteOpen(false)
        }}
      title={t('merchant.products.delete.title')}
      description={t('merchant.products.bulk.deleteConfirmation', { count: selectedIds.length })}
      />
    </>
  )
}
