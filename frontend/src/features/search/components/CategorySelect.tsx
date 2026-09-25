import { useState } from 'react'
import type { CategoryNode } from '@/types/search.types'

interface CategorySelectProps {
  categories: CategoryNode[]
  selectedCategoryId: string
  onSelect: (categoryId: string) => void
  variant?: 'default' | 'pills'
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

export function CategorySelect({ categories, selectedCategoryId, onSelect, variant = 'default' }: CategorySelectProps) {
  const [expanded, setExpanded] = useState(false)
  const safeCategories = Array.isArray(categories) ? categories : []
  const flatCategories = flattenCategories(safeCategories)

  const allItems = [{ id: '', name: 'All', depth: 0 }, ...flatCategories]
  const visibleItems = expanded ? allItems : allItems.slice(0, COLLAPSED_COUNT)
  const hasMore = allItems.length > COLLAPSED_COUNT

  return (
    <div className={variant === 'pills' ? 'flex flex-wrap gap-2' : 'space-y-1'}>
      {visibleItems.map((item) => {
          const isActive = item.id === selectedCategoryId
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`${variant === 'pills' ? 'rounded-full border px-3 py-1.5 text-sm font-medium' : 'block w-full text-left text-sm transition-colors'} ${
                isActive
                  ? variant === 'pills' ? 'border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-400/40 dark:bg-violet-400/15 dark:text-violet-200' : 'font-semibold text-orange-500'
                  : variant === 'pills' ? 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300' : 'text-gray-600 hover:text-orange-500'
              }`}
              style={variant === 'pills' ? undefined : { paddingLeft: `${item.depth + 1}rem` }}
            >
              {item.name}
            </button>
          )
        })}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={variant === 'pills' ? 'w-full text-left text-xs font-bold uppercase text-slate-500' : 'mt-1 pl-4 text-xs font-bold uppercase text-cyan-600 dark:text-cyan-400'}
        >
          {expanded ? 'View Less' : 'View More'}
        </button>
      )}
    </div>
  )
}
