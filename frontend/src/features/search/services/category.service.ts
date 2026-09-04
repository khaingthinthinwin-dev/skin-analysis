import api from '@/lib/api-client'
import type { CategoryNode } from '@/types/search.types'

export const categoryService = {
  async getTree(): Promise<{ data: CategoryNode[] }> {
    const response = await api.get<{ data: { data: CategoryNode[] } }>('/categories')
    return response.data.data
  },
}
