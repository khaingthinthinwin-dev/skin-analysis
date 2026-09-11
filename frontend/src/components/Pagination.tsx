import { PAGE_SIZE_OPTIONS } from '@/schemas/search.schema'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PaginationMeta } from '@/types/search.types'

interface PaginationProps {
  meta: PaginationMeta
  onLimitChange: (limit: number) => void
}

export function Pagination({ meta, onLimitChange }: PaginationProps) {
  return (
    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing{' '}
        <span className="font-medium text-foreground">
          {(meta.page - 1) * meta.limit + 1}-
          {Math.min(meta.page * meta.limit, meta.total)}
        </span>{' '}
        of <span className="font-medium text-foreground">{meta.total}</span> products
      </p>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show</span>
        <Select
          value={String(meta.limit)}
          onValueChange={(v) => onLimitChange(Number(v))}
        >
          <SelectTrigger className="w-[70px] h-9 border-violet-300 focus:ring-violet-500 focus:border-violet-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
