import type { User } from '@/types/auth.types';

type DeactivationFields = Pick<User, 'isActive' | 'is_active' | 'status'>;

export function isAccountDeactivated(
  user: DeactivationFields | null | undefined,
): boolean {
  if (!user) return false;

  const status = user.status?.toLowerCase();

  return (
    user.isActive === false ||
    user.is_active === false ||
    status === 'deactivated' ||
    status === 'inactive'
  );
}
