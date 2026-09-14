import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/services/queryKeys'
import { productService } from '@/services/product.service'
import { toast } from 'sonner'
import type {
  ProductQueryParams,
  CreateProductData,
  UpdateProductData,
  UpdateStockData,
  BulkActionData,
  BulkDeleteData,
  DeleteAllData,
} from '@/types/product.types'

export function useProducts(params?: ProductQueryParams) {
  return useQuery({
    queryKey: queryKeys.merchantProducts.list(params),
    queryFn: () => productService.getProducts(params),
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.merchantProducts.detail(id),
    queryFn: () => productService.getProductById(id),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProductData) => productService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantProducts.all })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductData }) =>
      productService.updateProduct(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantProducts.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantProducts.detail(id) })
    },
  })
}

export function useUpdateStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStockData }) =>
      productService.updateStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantProducts.all })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? productService.deleteProduct(id) : productService.hardDeleteProduct(id),
    onSuccess: (_, { id, isActive: wasActive }) => {
      queryClient.setQueriesData<import('@/types/product.types').ProductListResponse>(
        { queryKey: queryKeys.merchantProducts.all },
        (cached) => {
          if (!cached) return cached

          if (wasActive) {
            // Soft-delete: product was active → now inactive (isActive: false)
            // Keep it in the list but flip its status so "All" view shows it as Inactive
            // and "Active" filter will no longer include it after refetch.
            // Optimistically update the status badge immediately.
            const updatedItems = cached.items.map((p) =>
              p.id === id ? { ...p, isActive: false } : p,
            )
            return { ...cached, items: updatedItems }
          } else {
            // Hard-delete: product is permanently removed — strip it from the list
            const filteredItems = cached.items.filter((p) => p.id !== id)
            return {
              ...cached,
              items: filteredItems,
              meta: {
                ...cached.meta,
                total: Math.max(0, cached.meta.total - 1),
              },
            }
          }
        },
      )

      // Sync with server in the background (handles pagination total, filter consistency, etc.)
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantProducts.all })
    },
  })
}

export function useToggleFeatured() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productService.toggleFeatured(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantProducts.all })
    },
  })
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: BulkActionData) => productService.bulkUpdateStatus(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantProducts.all })
    },
  })
}

export function useBulkDelete() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: BulkDeleteData) => productService.bulkDelete(data),
    onSuccess: (_, variables) => {
      const deletedIds = new Set(variables.ids)

      // Immediately remove deleted products from every cached list so the UI
      // updates without waiting for the background refetch (spec: "Remove products from list")
      queryClient.setQueriesData<import('@/types/product.types').ProductListResponse>(
        { queryKey: queryKeys.merchantProducts.all },
        (cached) => {
          if (!cached) return cached
          const filteredItems = cached.items.filter((p) => !deletedIds.has(p.id))
          return {
            ...cached,
            items: filteredItems,
            meta: {
              ...cached.meta,
              total: Math.max(0, cached.meta.total - (cached.items.length - filteredItems.length)),
            },
          }
        },
      )

      // Invalidate to sync with server state in the background
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantProducts.all })
    },
  })
}

export function useDeleteAll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: DeleteAllData) => productService.deleteAll(data),
    onSuccess: (data) => {
      toast.success(
        `${data.deactivated} deactivated, ${data.permanentlyDeleted} permanently deleted, ${data.skippedActiveOrders} skipped (active orders)`,
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantProducts.all })
    },
  })
}

export function useCheckActiveOrders() {
  return useMutation({
    mutationFn: (ids: string[]) => productService.checkActiveOrders(ids),
  })
}
