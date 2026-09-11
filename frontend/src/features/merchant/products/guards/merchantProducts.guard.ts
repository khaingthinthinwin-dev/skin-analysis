import { useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'

export interface MerchantProductsGuardResult {
  isApproved: boolean
  isPending: boolean
  isRejected: boolean
  rejectionReason: string | null
  isLoading: boolean
  /** Whether to show CRUD buttons (Add, Edit, Delete, Bulk Actions) */
  showCrudActions: boolean
  /** Whether to show pending approval banner */
  showPendingBanner: boolean
  /** Whether to show rejection banner */
  showRejectionBanner: boolean
}

export function useMerchantProductsGuard(): MerchantProductsGuardResult {
  const { user, isLoading, refreshUser } = useAuth()

  useEffect(() => {
    if (!isLoading && user && !user.licenseStatus && !user.license_status) {
      refreshUser()
    }
  }, [isLoading, user, refreshUser])

  return useMemo(() => {
    if (isLoading) {
      return {
        isApproved: false,
        isPending: false,
        isRejected: false,
        rejectionReason: null,
        isLoading: true,
        showCrudActions: false,
        showPendingBanner: false,
        showRejectionBanner: false,
      }
    }

    const status =
      user?.licenseStatus ||
      user?.license_status
    const isApproved = status === 'approved'
    const isPending = status === 'pending'
    const isRejected = status === 'rejected'

    return {
      isApproved,
      isPending,
      isRejected,
      rejectionReason: null,
      isLoading: false,
      showCrudActions: isApproved,
      showPendingBanner: isPending,
      showRejectionBanner: isRejected,
    }
  }, [user, isLoading])
}
