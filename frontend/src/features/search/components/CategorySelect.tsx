import { useState } from 'react'
import type { CategoryNode } from '@/types/search.types'

interface CategorySelectProps {
  categories: CategoryNode[]
  selectedCategoryId: string
  onSelect: (categoryId: string) => void
}

const COLLAPSED_COUNT = 5

function flattenCategories(categories: CategoryNode[], depth = 0): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = []
  for (const category of categories) {
    result.push({ id: category.id, name: category.name, depth })
    if (category.children?.length) {
      result.push(...flattenCategories(category.children, depth + 1))
    }
  }
  return result
}

export function CategorySelect({ categories, selectedCategoryId, onSelect }: CategorySelectProps) {
  const [expanded, setExpanded] = useState(false)
  const safeCategories = Array.isArray(categories) ? categories : []
  const flatCategories = flattenCategories(safeCategories)

  const allItems = [{ id: '', name: 'All', depth: 0 }, ...flatCategories]
  const visibleItems = expanded ? allItems : allItems.slice(0, COLLAPSED_COUNT)
  const hasMore = allItems.length > COLLAPSED_COUNT

  return (
    <div className="space-y-1">
      {visibleItems.map((item) => {
        const isActive = item.id === selectedCategoryId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex w-full min-w-0 items-center truncate py-1.5 pr-3 pl-4 text-left text-[11px] transition-colors ${
              isActive
                ? 'rounded-md bg-primary/10 py-1.5 pr-3 pl-4 font-semibold text-primary'
                : 'text-foreground hover:bg-muted hover:text-primary'
            }`}
            style={{ paddingLeft: `${item.depth + 1}rem` }}
          >
            <span>{item.name}</span>
          </button>
        )
      })}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 pl-4 text-cyan-600 font-bold text-xs uppercase dark:text-cyan-400"
        >
          {expanded ? 'VIEW LESS' : 'VIEW MORE'}
        </button>
      )}
    </div>
  )
}
