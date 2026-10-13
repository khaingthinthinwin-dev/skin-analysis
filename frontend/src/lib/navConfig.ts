import {
  LayoutDashboard,
  Sparkles,
  Wand2,
  Heart,
  ShoppingCart,
  Package,
  Tag,
  Megaphone,
  Users,
  UserCheck,
  MessageSquare,
  DollarSign,
  FileText,
  ClipboardList,
  Search,
  History,
  User,
  Bell,
  PackageCheck,
  TrendingUp,
  Store,
  ShieldCheck,
  Database,
  type LucideIcon,
} from 'lucide-react'

export type UserRole = 'buyer' | 'merchant' | 'admin' | 'super_admin'

export interface NavItem {
  label: string
  labelKey: string
  href: string
  icon: LucideIcon
  badge?: string
  badgeVariant?: 'pink' | 'purple' | 'amber'
}

export interface NavSection {
  title?: string
  titleKey?: string
  items: NavItem[]
}

export interface RoleNavConfig {
  portalTitle: string
  portalTitleKey: string
  roleLabel: string
  roleLabelKey: string
  roleBadgeColor: string
  sections: NavSection[]
}

const adminNavConfig: RoleNavConfig = {
  portalTitle: 'Admin Console',
  portalTitleKey: 'nav.menu.adminConsole',
  roleLabel: 'Admin',
  roleLabelKey: 'roles.admin',
  roleBadgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  sections: [
    {
      title: 'Overview',
      titleKey: 'nav.menu.overview',
      items: [
        { label: 'Dashboard', labelKey: 'nav.dashboard', href: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Management',
      titleKey: 'nav.menu.management',
      items: [
        { label: 'Users', labelKey: 'nav.menu.users', href: '/admin/users', icon: Users },
        { label: 'Merchants', labelKey: 'nav.menu.merchants', href: '/admin/merchants', icon: UserCheck },
        { label: 'Order Insights', labelKey: 'nav.menu.orderInsights', href: '/admin/orders', icon: PackageCheck },
        { label: 'Advertisements', labelKey: 'nav.menu.advertisements', href: '/admin/ads', icon: Megaphone },
        { label: 'Reviews', labelKey: 'nav.menu.reviews', href: '/admin/reviews', icon: MessageSquare },
        { label: 'Content', labelKey: 'nav.menu.content', href: '/admin/content', icon: FileText },
      ],
    },
    {
      title: 'Finance & Governance',
      titleKey: 'nav.menu.financeGovernance',
      items: [
        { label: 'Commission & Revenue', labelKey: 'nav.menu.commissionRevenue', href: '/admin/commission-revenue', icon: DollarSign },
        { label: 'Audit Logs', labelKey: 'nav.menu.auditLogs', href: '/admin/audit-logs', icon: ClipboardList },
        { label: 'Master Data', labelKey: 'nav.menu.masterData', href: '/admin/master-data', icon: Database },
      ],
    },
    {
      title: 'Account',
      titleKey: 'nav.menu.account',
      items: [
        { label: 'Admin Profile', labelKey: 'nav.menu.adminProfile', href: '/admin/profile', icon: ShieldCheck },
        { label: 'Notifications', labelKey: 'nav.menu.notifications', href: '/admin/notifications', icon: Bell },
      ],
    },
  ],
}

export const roleNavConfigs: Record<UserRole, RoleNavConfig> = {
  buyer: {
    portalTitle: 'Beauty Portal',
    portalTitleKey: 'nav.menu.beautyPortal',
    roleLabel: 'Buyer',
    roleLabelKey: 'roles.buyer',
    roleBadgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    sections: [
      {
        title: 'Explore',
        titleKey: 'nav.menu.explore',
        items: [
          { label: 'Dashboard', labelKey: 'nav.dashboard', href: '/buyer', icon: LayoutDashboard },
          { label: 'Search Products', labelKey: 'nav.menu.searchProducts', href: '/buyer/search', icon: Search },
        ],
      },
      {
        title: 'AI Intelligence',
        titleKey: 'nav.menu.aiIntelligence',
        items: [
          { label: 'Skin Analysis', labelKey: 'nav.menu.skinAnalysis', href: '/buyer/skin-analysis', icon: Sparkles, badge: 'AI', badgeVariant: 'pink' },
          { label: 'Recommendations', labelKey: 'nav.menu.recommendations', href: '/buyer/recommendations', icon: Wand2 },
          { label: 'Analysis History', labelKey: 'nav.menu.analysisHistory', href: '/buyer/skin-analysis/history', icon: History },
        ],
      },
      {
        title: 'Shopping',
        titleKey: 'nav.menu.shopping',
        items: [
          { label: 'Wishlist', labelKey: 'nav.menu.wishlist', href: '/buyer/wishlist', icon: Heart },
          { label: 'Cart', labelKey: 'nav.menu.cart', href: '/buyer/cart', icon: ShoppingCart },
          { label: 'Order Insights', labelKey: 'nav.menu.orderInsights', href: '/orders', icon: PackageCheck },
        ],
      },
      {
        title: 'Account',
        titleKey: 'nav.menu.account',
        items: [
          { label: 'Profile', labelKey: 'nav.profile', href: '/buyer/profile', icon: User },
          { label: 'Notifications', labelKey: 'nav.menu.notifications', href: '/buyer/notifications', icon: Bell },
        ],
      },
    ],
  },
  merchant: {
    portalTitle: 'Merchant Hub',
    portalTitleKey: 'nav.menu.merchantHub',
    roleLabel: 'Merchant',
    roleLabelKey: 'roles.merchant',
    roleBadgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    sections: [
      {
        title: 'Overview',
        titleKey: 'nav.menu.overview',
        items: [
          { label: 'Dashboard', labelKey: 'nav.dashboard', href: '/merchant', icon: LayoutDashboard },
        ],
      },
      {
        title: 'Catalog & Sales',
        titleKey: 'nav.menu.catalogSales',
        items: [
<<<<<<< HEAD
          { label: 'Products', labelKey: 'nav.products', href: '/merchant/products', icon: Package },
=======
          { label: 'Products', labelKey: 'nav.menu.products', href: '/merchant/products', icon: Package },
>>>>>>> origin/main
          { label: 'Product Review', labelKey: 'nav.menu.productReview', href: '/merchant/product-review', icon: MessageSquare },
          { label: 'Promotions', labelKey: 'nav.menu.promotions', href: '/merchant/promotions', icon: Tag },
          { label: 'Advertisements', labelKey: 'nav.menu.advertisements', href: '/merchant/advertisements', icon: Megaphone },
        ],
      },
      {
        title: 'Analytics & Account',
        titleKey: 'nav.menu.analyticsAccount',
        items: [
          { label: 'Order Insights', labelKey: 'nav.menu.orderInsights', href: '/merchant/order-insights', icon: TrendingUp },
          { label: 'Store Profile', labelKey: 'nav.menu.storeProfile', href: '/merchant/profile', icon: Store },
          { label: 'Notifications', labelKey: 'nav.menu.notifications', href: '/merchant/notifications', icon: Bell },
        ],
      },
    ],
  },
  admin: adminNavConfig,
  super_admin: adminNavConfig,
}
