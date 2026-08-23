import { createBrowserRouter } from 'react-router'
import { lazy, Suspense } from 'react'
import { MainLayout } from '@/layouts/MainLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { BuyerLayout } from '@/layouts/BuyerLayout'
import { MerchantLayout } from '@/layouts/MerchantLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const Home = lazy(() => import('@/pages/buyer/Dashboard'))
const About = lazy(() => import('@/pages/About'))
const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const Profile = lazy(() => import('@/pages/shared/Profile'))
const Settings = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const Unauthorized = lazy(() => import('@/pages/Unauthorized'))

const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminUserManagement = lazy(() => import('@/pages/admin/UserManagement'))
const AdminMerchantManagement = lazy(() => import('@/pages/admin/MerchantManagement'))
const AdminAdvertisementManagement = lazy(() => import('@/pages/admin/AdvertisementManagement'))
const AdminReviewManagement = lazy(() => import('@/pages/admin/ReviewManagement'))
const AdminContentModeration = lazy(() => import('@/pages/admin/ContentModeration'))
const AdminCommissionRevenue = lazy(() => import('@/pages/admin/CommissionRevenue'))
const CreateAdminAccount = lazy(() => import('@/pages/admin/CreateAdminAccount'))

const AdminAuditLog = lazy(() => import('@/pages/admin/AuditLog'))

const BuyerDashboard = lazy(() => import('@/pages/buyer/Dashboard'))
const BuyerSearchFilter = lazy(() => import('@/pages/buyer/SearchFilter'))
const BuyerProductDetail = lazy(() => import('@/pages/buyer/ProductDetail'))
const BuyerWishlist = lazy(() => import('@/pages/buyer/Wishlist'))
const BuyerCart = lazy(() => import('@/pages/buyer/Cart'))
const BuyerCheckout = lazy(() => import('@/pages/buyer/Checkout'))
const BuyerSkinAnalysis = lazy(() => import('@/pages/buyer/SkinAnalysis'))
const BuyerMatchingRecommendations = lazy(() => import('@/pages/buyer/MatchingRecommendations'))
const BuyerRecommendationHistory = lazy(() => import('@/pages/buyer/RecommendationHistory'))

const MerchantDashboard = lazy(() => import('@/pages/merchant/Dashboard'))
const MerchantProductManagement = lazy(() => import('@/pages/merchant/ProductManagement'))
const MerchantAdvertisements = lazy(() => import('@/pages/merchant/Advertisements'))
const MerchantPromotions = lazy(() => import('@/pages/merchant/Promotions'))

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingSpinner className="min-h-screen" />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <Home />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'about',
        element: (
          <SuspenseWrapper>
            <About />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'unauthorized',
        element: (
          <SuspenseWrapper>
            <Unauthorized />
          </SuspenseWrapper>
        ),
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'dashboard',
            element: <DashboardLayout />,
            children: [
              {
                path: 'profile',
                element: (
                  <SuspenseWrapper>
                    <Profile />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'settings',
                element: (
                  <SuspenseWrapper>
                    <Settings />
                  </SuspenseWrapper>
                ),
              },
            ],
          },
        ],
      },
      {
        path: 'admin',
        element: <ProtectedRoute allowedRoles={['admin']} />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              {
                index: true,
                element: (
                  <SuspenseWrapper>
                    <AdminDashboard />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'users',
                element: (
                  <SuspenseWrapper>
                    <AdminUserManagement />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'merchants',
                element: (
                  <SuspenseWrapper>
                    <AdminMerchantManagement />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'advertisements',
                element: (
                  <SuspenseWrapper>
                    <AdminAdvertisementManagement />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'reviews',
                element: (
                  <SuspenseWrapper>
                    <AdminReviewManagement />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'content',
                element: (
                  <SuspenseWrapper>
                    <AdminContentModeration />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'commission-revenue',
                element: (
                  <SuspenseWrapper>
                     <AdminCommissionRevenue />
                  </SuspenseWrapper>
                ),
              },

              {
                path: 'audit-logs',
                element: (
                  <SuspenseWrapper>
                    <AdminAuditLog />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'create-admin',
                element: (
                  <SuspenseWrapper>
                    <CreateAdminAccount />
                  </SuspenseWrapper>
                ),
              },
            ],
          },
        ],
      },
      {
        path: 'buyer',
        element: <ProtectedRoute allowedRoles={['buyer']} />,
        children: [
          {
            element: <BuyerLayout />,
            children: [
              {
                index: true,
                element: (
                  <SuspenseWrapper>
                    <BuyerDashboard />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'search',
                element: (
                  <SuspenseWrapper>
                    <BuyerSearchFilter />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'products/:id',
                element: (
                  <SuspenseWrapper>
                    <BuyerProductDetail />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'wishlist',
                element: (
                  <SuspenseWrapper>
                    <BuyerWishlist />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'cart',
                element: (
                  <SuspenseWrapper>
                    <BuyerCart />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'checkout',
                element: (
                  <SuspenseWrapper>
                    <BuyerCheckout />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'skin-analysis',
                element: (
                  <SuspenseWrapper>
                    <BuyerSkinAnalysis />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'recommendations',
                element: (
                  <SuspenseWrapper>
                    <BuyerMatchingRecommendations />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'recommendation-history',
                element: (
                  <SuspenseWrapper>
                    <BuyerRecommendationHistory />
                  </SuspenseWrapper>
                ),
              },
            ],
          },
        ],
      },
      {
        path: 'merchant',
        element: <ProtectedRoute allowedRoles={['merchant']} />,
        children: [
          {
            element: <MerchantLayout />,
            children: [
              {
                index: true,
                element: (
                  <SuspenseWrapper>
                    <MerchantDashboard />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'products',
                element: (
                  <SuspenseWrapper>
                    <MerchantProductManagement />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'advertisements',
                element: (
                  <SuspenseWrapper>
                    <MerchantAdvertisements />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'promotions',
                element: (
                  <SuspenseWrapper>
                    <MerchantPromotions />
                  </SuspenseWrapper>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: (
      <AuthLayout>
        <SuspenseWrapper>
          <Login />
        </SuspenseWrapper>
      </AuthLayout>
    ),
  },
  {
    path: '/register',
    element: (
      <AuthLayout>
        <SuspenseWrapper>
          <Register />
        </SuspenseWrapper>
      </AuthLayout>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <AuthLayout>
        <SuspenseWrapper>
          <ForgotPassword />
        </SuspenseWrapper>
      </AuthLayout>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <AuthLayout>
        <SuspenseWrapper>
          <ResetPassword />
        </SuspenseWrapper>
      </AuthLayout>
    ),
  },
  {
    path: '*',
    element: (
      <SuspenseWrapper>
        <NotFound />
      </SuspenseWrapper>
    ),
  },
])
