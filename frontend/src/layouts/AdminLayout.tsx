import { Outlet } from 'react-router';
import { DashboardLayout } from './DashboardLayout';

export function AdminLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
