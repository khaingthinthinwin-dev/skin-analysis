import { Outlet } from 'react-router';
import { DashboardLayout } from './DashboardLayout';

export function BuyerLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
