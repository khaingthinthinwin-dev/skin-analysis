import { useAuth } from '@/features/auth/hooks/useAuth';
import { BuyerNavbar } from './BuyerNavbar';
import { MerchantNavbar } from './MerchantNavbar';
import { AdminNavbar } from './AdminNavbar';

export function RoleBasedMenu() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminNavbar />;
    case 'merchant':
      return <MerchantNavbar />;
    case 'buyer':
    default:
      return <BuyerNavbar />;
  }
}
