import { useQuery } from '@tanstack/react-query'
import { categoryService } from '../services/category.service'

export function useCategoryTree() {
  return useQuery({
    queryKey: ['categories'] as const,
    queryFn: categoryService.getTree,
    staleTime: 30 * 60 * 1000,
  })
}
