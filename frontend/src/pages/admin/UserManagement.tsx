// [PET] User Management - Manage user accounts, roles, and status
import { useState } from 'react';
import { useAdmin } from '@/features/admin/user-management/hooks/useAdmin';
import { UsersTable } from '@/features/admin/user-management/components/UsersTable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';

export default function UserManagement() {
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const { usersQuery, toggleUserStatusMutation } = useAdmin({
    role: roleFilter || undefined,
    is_active: statusFilter,
  });

  const handleToggle = (userId: string, currentStatus: boolean) => {
    toggleUserStatusMutation.mutate(
      { userId, isActive: !currentStatus },
      {
        onSuccess: () => {
          toast({
            title: 'User status updated',
            description: `User has been ${!currentStatus ? 'activated' : 'deactivated'}.`,
            variant: 'default',
          });
        },
        onError: () => {
          toast({ title: 'Failed to update user status', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Manage user accounts, roles, and status</p>
      </div>

      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Role:</span>
              <div className="flex gap-2">
                {['', 'buyer', 'merchant', 'admin'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      roleFilter === r
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {r || 'All'}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <div className="flex gap-2">
                {[
                  { label: 'All', value: undefined },
                  { label: 'Active', value: true },
                  { label: 'Inactive', value: false },
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setStatusFilter(s.value)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      statusFilter === s.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Total users:</span>
        <Badge variant="secondary">{usersQuery.data?.total ?? 0}</Badge>
      </div>

      <UsersTable
        users={usersQuery.data?.items}
        onToggleStatus={handleToggle}
      />
    </div>
  );
}
