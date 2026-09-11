import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { ProductForm } from '@/components/merchant/ProductForm'

export default function ProductCreate() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const status =
    user?.licenseStatus ||
    user?.license_status

  useEffect(() => {
    if (status === 'pending') {
      toast.error(
        'Your merchant account is pending approval. This operation is restricted until your license is approved.',
      )
      navigate('/merchant/products', { replace: true })
    }
  }, [status, navigate])

  if (status === 'pending') {
    return null
  }

  return (
    <div className="p-2 lg:p-4">
      <ProductForm mode="create" />
    </div>
  )
}
