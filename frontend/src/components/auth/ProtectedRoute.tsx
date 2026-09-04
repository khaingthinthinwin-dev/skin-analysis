import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface ProtectedRouteProps {
  roles?: string[]
  allowedRoles?: string[]
}

export function ProtectedRoute({ roles, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const effectiveRoles = roles ?? allowedRoles

  if (isLoading) return <LoadingSpinner className="min-h-screen" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (effectiveRoles && user && !effectiveRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
