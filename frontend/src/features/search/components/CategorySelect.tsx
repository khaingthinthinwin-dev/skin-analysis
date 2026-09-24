import { useState } from 'react'
import type { CategoryNode } from '@/types/search.types'

interface CategorySelectProps {
  categories: CategoryNode[]
  selectedCategoryId: string
  onSelect: (categoryId: string) => void
  activeClassName?: string
  noIndent?: boolean
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

export function CategorySelect({
  categories,
  selectedCategoryId,
  onSelect,
  activeClassName,
  noIndent,
}: CategorySelectProps) {
  const [expanded, setExpanded] = useState(false)
  const safeCategories = Array.isArray(categories) ? categories : []
  const flatCategories = flattenCategories(safeCategories)

  const allItems = [{ id: '', name: 'All', depth: 0 }, ...flatCategories]
  const visibleItems = expanded ? allItems : allItems.slice(0, COLLAPSED_COUNT)
  const hasMore = allItems.length > COLLAPSED_COUNT

  const defaultActiveClass =
    'bg-gradient-to-r from-purple-200/80 to-purple-100/60 border border-purple-500 font-semibold text-purple-700 dark:from-purple-950 dark:to-purple-900/70 dark:border-purple-600 dark:text-purple-300'

  return (
    <div className="space-y-1">
      {visibleItems.map((item) => {
        const isActive = item.id === selectedCategoryId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors cursor-pointer ${
              isActive
                ? activeClassName ?? defaultActiveClass
                : 'text-foreground hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-600 dark:hover:text-purple-300'
            }`}
            style={{ paddingLeft: noIndent ? (isActive ? '0.5rem' : 0) : `${item.depth * 1}rem` }}
          >
            {item.name}
          </button>
        )
      })}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 text-cyan-600 font-bold text-xs uppercase"
        >
          {expanded ? 'View Less' : 'View More'}
        </button>
      )}
    </div>
  )
}
