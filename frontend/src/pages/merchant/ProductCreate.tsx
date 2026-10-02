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
  const isDeactivated =
    user?.isActive === false ||
    user?.is_active === false ||
    user?.status === 'deactivated' ||
    user?.status === 'inactive'

  useEffect(() => {
    if (isDeactivated) {
      toast.error(
        'Your merchant account is currently Deactivate. Some features may be restricted until an admin activates your account.',
      )
      navigate('/merchant/products', { replace: true })
      return
    }
    if (status === 'pending') {
      toast.error(
        'Your merchant account is pending approval. This operation is restricted until your license is approved.',
      )
      navigate('/merchant/products', { replace: true })
      return
    }
    if (status === 'rejected') {
      toast.error(
        'Your merchant account has been rejected. Please contact support.',
      )
      navigate('/merchant/products', { replace: true })
    }
  }, [status, isDeactivated, navigate])

  if (isDeactivated || status === 'pending' || status === 'rejected') {
    return null
  }

  return (
    <div className="p-2 lg:p-4">
      <ProductForm mode="create" />
    </div>
  )
}
