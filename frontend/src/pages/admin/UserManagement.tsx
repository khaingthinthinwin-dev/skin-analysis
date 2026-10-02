import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdmin } from '@/features/admin/user-management/hooks/useAdmin';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle,
  XCircle,
  Shield,
  UserCheck,
  UserX,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { User } from '@/features/admin/user-management/services/admin.service';

// ─── Stats Types ────────────────────────────────────────────────────────────

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  admin: number;
}

// ─── Stats Fetcher Hook ─────────────────────────────────────────────────────

function useUserStats() {
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    inactive: 0,
    admin: 0,
  });

  const fetchStats = useCallback(async () => {
    const [totalRes, activeRes, inactiveRes, adminRes] = await Promise.all([
      api.get('/admin/users', { params: { limit: 1 } }),
      api.get('/admin/users', { params: { status: 'active', limit: 1 } }),
      api.get('/admin/users', { params: { status: 'inactive', limit: 1 } }),
      api.get('/admin/users', { params: { status: 'admin', limit: 1 } }),
    ]);
    setStats({
      total: totalRes.data.data.total ?? 0,
      active: activeRes.data.data.total ?? 0,
      inactive: inactiveRes.data.data.total ?? 0,
      admin: adminRes.data.data.total ?? 0,
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [totalRes, activeRes, inactiveRes, adminRes] = await Promise.all([
          api.get('/admin/users', { params: { limit: 1 }, signal: controller.signal }),
          api.get('/admin/users', { params: { status: 'active', limit: 1 }, signal: controller.signal }),
          api.get('/admin/users', { params: { status: 'inactive', limit: 1 }, signal: controller.signal }),
          api.get('/admin/users', { params: { status: 'admin', limit: 1 }, signal: controller.signal }),
        ]);
        setStats({
          total: totalRes.data.data.total ?? 0,
          active: activeRes.data.data.total ?? 0,
          inactive: inactiveRes.data.data.total ?? 0,
          admin: adminRes.data.data.total ?? 0,
        });
      } catch {
        // Stats will remain at 0 on error
      }
    }
    load();
    return () => controller.abort();
  }, []);

  return { stats, refreshStats: fetchStats };
}

// ─── Debounce Hook ──────────────────────────────────────────────────────────

function useDebounced(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Helper Components ──────────────────────────────────────────────────────

function UserStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-red-500/10 text-red-400 border-red-500/20'
      }
    >
      {isActive ? (
        <CheckCircle className="h-3 w-3 mr-1" />
      ) : (
        <XCircle className="h-3 w-3 mr-1" />
      )}
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}

function RoleBadge({ role }: { role: string }) {
  const variants: Record<string, string> = {
    admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    merchant: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    buyer: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  };
  return (
    <Badge variant="outline" className={variants[role] || ''}>
      {role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function canChangeUserStatus(user: User): boolean {
  if (user.roleCode !== 'merchant') return true;
  if (!user.merchant) return true;
  return user.merchant.licenseStatus === 'approved';
}

function getLicenseStatusTooltip(user: User): string | null {
  if (user.roleCode !== 'merchant') return null;
  if (!user.merchant) return null;
  if (user.merchant.licenseStatus === 'approved') return null;
  return `License status: ${user.merchant.licenseStatus}. Only merchants with approved licenses can be deactivated or reactivated.`;
}

const avatarColors = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getPageNumbers(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | string)[] = [];
  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total);
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function UserManagement() {
  // ── State ───────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [userSort, setUserSort] = useState('createdAt');
  const [userOrder, setUserOrder] = useState<'asc' | 'desc'>('desc');

  // ── Dialog State ────────────────────────────────────────────────────────
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [reactivateTarget, setReactivateTarget] = useState<User | null>(null);

  // ── Stats ───────────────────────────────────────────────────────────────
  const { stats, refreshStats } = useUserStats();

  // ── Queries ─────────────────────────────────────────────────────────────
  const { usersQuery, toggleUserStatusMutation } = useAdmin({
    page,
    limit,
    status: (status as 'active' | 'inactive' | 'admin' | undefined) || undefined,
    search: debouncedSearch || undefined,
    sort: userSort,
    order: userOrder,
  });

  // ── Derived Data ────────────────────────────────────────────────────────
  const users = usersQuery.data?.items || [];
  const totalPages = usersQuery.data?.totalPages || 1;
  const total = usersQuery.data?.total ?? 0;

  // ── Sort Mapping ────────────────────────────────────────────────────────
  const sortOptions = useMemo(
    () => [
      { value: 'createdAt:desc', label: 'Newest' },
      { value: 'createdAt:asc', label: 'Oldest' },
      { value: 'name:asc', label: 'Name (A-Z)' },
      { value: 'name:desc', label: 'Name (Z-A)' },
    ],
    [],
  );

  const currentSortValue = `${userSort}:${userOrder}`;

  const handleSortChange = (value: string) => {
    const [sort, order] = value.split(':');
    setUserSort(sort);
    setUserOrder(order as 'asc' | 'desc');
    setPage(1);
  };

  // ── Self-deactivation prevention ────────────────────────────────────────
  const currentUserId = localStorage.getItem('userId');

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleDeactivate = (user: User) => {
    if (!deactivateReason.trim()) return;
    toggleUserStatusMutation.mutate(
      { userId: user.id, isActive: false, reason: deactivateReason },
      {
        onSuccess: () => {
          toast.success('User deactivated');
          setDeactivateTarget(null);
          setDeactivateReason('');
          setDetailUser(null);
          refreshStats();
        },
        onError: (error: unknown) => {
          const msg =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to deactivate user';
          toast.error(msg);
        },
      },
    );
  };

  const handleReactivate = (user: User) => {
    toggleUserStatusMutation.mutate(
      { userId: user.id, isActive: true },
      {
        onSuccess: () => {
          toast.success('User reactivated');
          setReactivateTarget(null);
          setDetailUser(null);
          refreshStats();
        },
        onError: (error: unknown) => {
          const msg =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to reactivate user';
          toast.error(msg);
        },
      },
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* ── [A] Page Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          User Management
        </h1>
        <p className="text-muted-foreground">
          Manage user accounts, activate or deactivate users
        </p>
      </div>

      {/* ── [B] Stats Bar ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: 'Total Users',
            value: stats.total,
            icon: Users,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            filter: '',
          },
          {
            label: 'Active',
            value: stats.active,
            icon: CheckCircle,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            filter: 'active',
          },
          {
            label: 'Inactive',
            value: stats.inactive,
            icon: XCircle,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            filter: 'inactive',
          },
          {
            label: 'Admin',
            value: stats.admin,
            icon: Shield,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            filter: 'admin',
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            role="button"
            tabIndex={0}
            onClick={() => {
              setStatus(stat.filter);
              setPage(1);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setStatus(stat.filter);
                setPage(1);
              }
            }}
            className={`cursor-pointer transition-all ${
              status === stat.filter
                ? 'ring-2 ring-primary/60 shadow-sm'
                : 'hover:border-primary/40 hover:shadow-sm'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── [C] Search + Sort Bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-start gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select value={currentSortValue} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[180px]">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── [E] Users Table ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white ${getAvatarColor(
                            user.name || '',
                          )}`}
                        >
                          {getInitials(user.name || '?')}
                        </div>
                      )}
                      <p className="font-medium text-sm">{user.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={user.roleCode} />
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge isActive={user.isActive} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => setDetailUser(user)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {user.isActive && user.id !== currentUserId && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  disabled={!canChangeUserStatus(user)}
                                  onClick={() => setDeactivateTarget(user)}
                                >
                                  <UserX className="h-4 w-4 text-destructive" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {getLicenseStatusTooltip(user) && (
                              <TooltipContent>
                                <p>{getLicenseStatusTooltip(user)}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {!user.isActive && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  disabled={!canChangeUserStatus(user)}
                                  onClick={() => setReactivateTarget(user)}
                                >
                                  <UserCheck className="h-4 w-4 text-emerald-500" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {getLicenseStatusTooltip(user) && (
                              <TooltipContent>
                                <p>{getLicenseStatusTooltip(user)}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── [F] Pagination ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          Showing {users.length > 0 ? (page - 1) * limit + 1 : 0}-
          {Math.min(page * limit, total)} of {total} users
        </span>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="h-8 px-2 text-sm rounded-md border bg-background"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPageNumbers(page, totalPages).map((p, idx) =>
              typeof p === 'number' ? (
                <Button
                  key={idx}
                  size="icon"
                  variant={p === page ? 'default' : 'outline'}
                  className="h-8 w-8"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ) : (
                <span
                  key={idx}
                  className="flex items-center px-1 text-muted-foreground"
                >
                  ...
                </span>
              ),
            )}
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* DIALOGS                                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* ── User Detail Modal ────────────────────────────────────────────── */}
      <Dialog open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <DialogContent className="max-w-xl rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl">
          <DialogHeader className="border-b border-slate-200 pb-2">
            <DialogTitle className="text-base font-semibold tracking-wide text-slate-900">
              User Detail
            </DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-3 pt-1">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    User Information
                  </p>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-2">
                  <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 mb-1">
                    Account
                  </p>
                  <div className="flex items-center gap-3">
                    {detailUser.avatarUrl ? (
                      <img
                        src={detailUser.avatarUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700">
                        {detailUser.name
                          ?.split(' ')
                          .map((part: string) => part[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2) || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {detailUser.name}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {detailUser.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Role
                    </p>
                    <div className="mt-1">
                      <RoleBadge role={detailUser.roleCode} />
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Status
                    </p>
                    <div className="mt-1">
                      <UserStatusBadge isActive={detailUser.isActive} />
                    </div>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Joined
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {new Date(detailUser.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      User ID
                    </p>
                    <p className="mt-1 text-xs font-mono text-slate-600">
                      {detailUser.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Profile
                  </p>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-2">
                  <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 mb-1">
                    Name
                  </p>
                  <p className="text-sm text-slate-900">
                    {detailUser.name || 'N/A'}
                  </p>
                </div>

                <div className="mt-2 rounded-md border border-slate-200 bg-white p-2">
                  <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 mb-1">
                    Email
                  </p>
                  <p className="text-sm text-slate-900">
                    {detailUser.email || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setDetailUser(null)}
                >
                  Cancel
                </Button>
                {detailUser.isActive && detailUser.id !== currentUserId && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="destructive"
                            disabled={!canChangeUserStatus(detailUser)}
                            onClick={() => {
                              setDetailUser(null);
                              setDeactivateTarget(detailUser);
                            }}
                          >
                            <UserX className="h-4 w-4 mr-1" /> Deactivate
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {getLicenseStatusTooltip(detailUser) && (
                        <TooltipContent>
                          <p>{getLicenseStatusTooltip(detailUser)}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
                {!detailUser.isActive && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            className="bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                            disabled={!canChangeUserStatus(detailUser)}
                            onClick={() => {
                              setDetailUser(null);
                              setReactivateTarget(detailUser);
                            }}
                          >
                            <UserCheck className="h-4 w-4 mr-1" /> Reactivate
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {getLicenseStatusTooltip(detailUser) && (
                        <TooltipContent>
                          <p>{getLicenseStatusTooltip(detailUser)}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Deactivate User Confirmation ─────────────────────────────────── */}
      <Dialog
        open={!!deactivateTarget}
        onOpenChange={() => {
          setDeactivateTarget(null);
          setDeactivateReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to deactivate{' '}
            <strong>{deactivateTarget?.name}</strong>? They will not be able to
            log in.
          </p>
          <Textarea
            placeholder="Enter reason for deactivation (required)..."
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right">
            {deactivateReason.length}/500
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeactivateTarget(null);
                setDeactivateReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!deactivateReason.trim()}
              onClick={() => deactivateTarget && handleDeactivate(deactivateTarget)}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reactivate User Confirmation ─────────────────────────────────── */}
      <Dialog
        open={!!reactivateTarget}
        onOpenChange={() => setReactivateTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate User</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to reactivate{' '}
            <strong>{reactivateTarget?.name}</strong>? They will be able to log
            in again.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => reactivateTarget && handleReactivate(reactivateTarget)}
              disabled={toggleUserStatusMutation.isPending}
            >
              Reactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
