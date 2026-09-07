import { useParams, useNavigate } from 'react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProductForm } from '@/components/merchant/ProductForm'
import { useProduct } from '@/hooks/useProducts'
import { useAuth } from '@/hooks/useAuth'

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: product, isLoading, error } = useProduct(id || '')

  const status =
    user?.licenseStatus ||
    user?.license_status

  useEffect(() => {
    if (status === 'pending') {
      toast.error(
        'Your merchant account is pending approval. This operation is restricted until your license is approved.',
      )
      navigate('/merchant/products', { replace: true })
      return
    }
    if (!isLoading && error) {
      navigate('/merchant/products')
    }
  }, [status, isLoading, error, navigate])

  if (status === 'pending') {
    return null
  }

  if (isLoading) {
    return <LoadingSpinner className="min-h-[400px]" />
  }

  if (!product) return null

  return (
    <div className="p-2 lg:p-4">
      <ProductForm product={product} mode="edit" />
    </div>
  )
}
