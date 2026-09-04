import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/services/queryKeys'
import { productService } from '@/services/product.service'
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
    mutationFn: (id: string) => productService.deleteProduct(id),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantProducts.all })
    },
  })
}

export function useDeleteAll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: DeleteAllData) => productService.deleteAll(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantProducts.all })
    },
  })
}
