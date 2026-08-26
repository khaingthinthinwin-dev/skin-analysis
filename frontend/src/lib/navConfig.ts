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
  type LucideIcon,
} from 'lucide-react'

export type UserRole = 'buyer' | 'merchant' | 'admin' | 'super_admin'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
  badgeVariant?: 'pink' | 'purple' | 'amber'
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

export interface RoleNavConfig {
  portalTitle: string
  roleLabel: string
  roleBadgeColor: string
  sections: NavSection[]
}

export const roleNavConfigs: Record<UserRole, RoleNavConfig> = {
  buyer: {
    portalTitle: 'Beauty Portal',
    roleLabel: 'Buyer',
    roleBadgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    sections: [
      {
        title: 'Explore',
        items: [
          { label: 'Dashboard', href: '/buyer', icon: LayoutDashboard },
          { label: 'Search Products', href: '/buyer/search', icon: Search },
        ],
      },
      {
        title: 'AI Intelligence',
        items: [
          { label: 'Skin Analysis', href: '/buyer/skin-analysis', icon: Sparkles, badge: 'AI', badgeVariant: 'pink' },
          { label: 'Recommendations', href: '/buyer/recommendations', icon: Wand2 },
          { label: 'Analysis History', href: '/buyer/recommendation-history', icon: History },
        ],
      },
      {
        title: 'Shopping',
        items: [
          { label: 'Wishlist', href: '/buyer/wishlist', icon: Heart },
          { label: 'Cart', href: '/buyer/cart', icon: ShoppingCart },
          { label: 'Order Insights', href: '/buyer/order-insights', icon: PackageCheck },
        ],
      },
      {
        title: 'Account',
        items: [
          { label: 'Profile', href: '/buyer/profile', icon: User },
          { label: 'Notifications', href: '/buyer/notifications', icon: Bell },
        ],
      },
    ],
  },
  merchant: {
    portalTitle: 'Merchant Hub',
    roleLabel: 'Merchant',
    roleBadgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    sections: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', href: '/merchant', icon: LayoutDashboard },
        ],
      },
      {
        title: 'Catalog & Sales',
        items: [
          { label: 'Products', href: '/merchant/products', icon: Package },
          { label: 'Promotions', href: '/merchant/promotions', icon: Tag },
          { label: 'Advertisements', href: '/merchant/advertisements', icon: Megaphone },
        ],
      },
      {
        title: 'Analytics & Account',
        items: [
          { label: 'Order Insights', href: '/merchant/order-insights', icon: TrendingUp },
          { label: 'Store Profile', href: '/merchant/profile', icon: Store },
          { label: 'Notifications', href: '/merchant/notifications', icon: Bell },
        ],
      },
    ],
  },
  admin: {
    portalTitle: 'Admin Console',
    roleLabel: 'Admin',
    roleBadgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    sections: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        ],
      },
      {
        title: 'Management',
        items: [
          { label: 'Users', href: '/admin/users', icon: Users },
          { label: 'Merchants', href: '/admin/merchants', icon: UserCheck },
          { label: 'Advertisements', href: '/admin/advertisements', icon: Megaphone },
          { label: 'Reviews', href: '/admin/reviews', icon: MessageSquare },
          { label: 'Content', href: '/admin/content', icon: FileText },
        ],
      },
      {
        title: 'Finance & Governance',
        items: [
          { label: 'Commission & Revenue', href: '/admin/commission-revenue', icon: DollarSign },
          { label: 'Audit Logs', href: '/admin/audit-logs', icon: ClipboardList },
        ],
      },
      {
        title: 'Account',
        items: [
          { label: 'Admin Profile', href: '/admin/profile', icon: ShieldCheck },
          { label: 'Notifications', href: '/admin/notifications', icon: Bell },
        ],
      },
    ],
  },
}

roleNavConfigs.super_admin = roleNavConfigs.admin
