import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { User } from '../services/admin.service';

interface UsersTableProps {
  users?: User[];
  onToggleStatus?: (userId: string, currentStatus: boolean) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({ users = [], onToggleStatus }) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.users.table.user', 'User')}</TableHead>

            <TableHead>{t('admin.users.field.email', 'Email')}</TableHead>
            <TableHead>{t('admin.users.field.role', 'Role')}</TableHead>
            <TableHead>{t('admin.users.field.status', 'Status')}</TableHead>
            <TableHead className="text-right">{t('admin.users.table.actions', 'Actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                {t('admin.users.table.noUsers', 'No users found.')}
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={String(user.id)}>
                <TableCell className="font-medium">{user.name || t('admin.users.na', 'N/A')}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {t(`roles.${user.roleCode ?? user.role ?? 'buyer'}`, user.roleCode ?? user.role ?? 'buyer')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={user.isActive ? 'bg-emerald-500' : 'bg-destructive'}>
                    {user.isActive ? t('admin.users.status.active', 'Active') : t('admin.users.status.inactive', 'Inactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={user.isActive ? 'destructive' : 'default'}
                    onClick={() => onToggleStatus?.(String(user.id), user.isActive)}
                  >
                    {user.isActive ? t('admin.users.deactivate.button', 'Deactivate') : t('admin.users.activate.button', 'Activate')}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
