import { useState } from 'react';
import { useMerchantApproval } from '@/features/admin/merchant-management/hooks/useMerchantApproval';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  MoreHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Merchant } from '@/features/admin/merchant-management/services/merchant.service';

export default function MerchantManagement() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');

  const [approveTarget, setApproveTarget] = useState<Merchant | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Merchant | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailMerchant, setDetailMerchant] = useState<Merchant | null>(null);

  const { merchantsQuery, approveMutation, rejectMutation } = useMerchantApproval({
    page,
    limit: 20,
    status: (status as 'pending' | 'approved' | 'rejected' | undefined) || undefined,
    search: search || undefined,
  });

  const handleApprove = (merchant: Merchant) => {
    approveMutation.mutate(
      { id: merchant.id },
      {
        onSuccess: () => {
          toast.success('Merchant approved');
          setApproveTarget(null);
        },
        onError: () => toast.error('Failed to approve merchant'),
      },
    );
  };

  const handleReject = () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    rejectMutation.mutate(
      { id: rejectTarget.id, reason: rejectReason },
      {
        onSuccess: () => {
          toast.success('Merchant rejected');
          setRejectTarget(null);
          setRejectReason('');
        },
        onError: () => toast.error('Failed to reject merchant'),
      },
    );
  };

  const merchants = merchantsQuery.data?.items || [];
  const totalPages = merchantsQuery.data?.totalPages || 1;

  const statusBadge = (s: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return <Badge className={variants[s] || ''}>{s}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Merchant Management</h1>
        <p className="text-muted-foreground">Review business licenses and manage merchant registrations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: merchantsQuery.data?.total ?? 0, color: 'bg-blue-100 text-blue-800' },
          { label: 'Pending', value: merchants.filter((m) => m.licenseStatus === 'pending').length, color: 'bg-amber-100 text-amber-800' },
          { label: 'Approved', value: merchants.filter((m) => m.licenseStatus === 'approved').length, color: 'bg-emerald-100 text-emerald-800' },
          { label: 'Rejected', value: merchants.filter((m) => m.licenseStatus === 'rejected').length, color: 'bg-red-100 text-red-800' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <Badge className={stat.color}>{stat.value}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {[
            { value: '', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1); }}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                status === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search merchants..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No merchants found.
                </TableCell>
              </TableRow>
            ) : (
              merchants.map((merchant) => (
                <TableRow key={merchant.id}>
                  <TableCell className="font-medium">{merchant.shopName}</TableCell>
                  <TableCell>{merchant.user?.name || 'N/A'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {merchant.user?.email || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(merchant.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{statusBadge(merchant.licenseStatus)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailMerchant(merchant)}>
                          <Eye className="h-4 w-4 mr-2" /> View Detail
                        </DropdownMenuItem>
                        {merchant.licenseStatus === 'pending' && (
                          <>
                            <DropdownMenuItem onClick={() => setApproveTarget(merchant)}>
                              <Check className="h-4 w-4 mr-2" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRejectTarget(merchant)}>
                              <X className="h-4 w-4 mr-2" /> Reject
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Merchant</DialogTitle>
          </DialogHeader>
          {approveTarget && (
            <p>
              Are you sure you want to approve <strong>{approveTarget.shopName}</strong>?
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button onClick={() => approveTarget && handleApprove(approveTarget)}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={() => { setRejectTarget(null); setRejectReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Merchant</DialogTitle>
          </DialogHeader>
          {rejectTarget && (
            <div className="space-y-4">
              <p>
                Are you sure you want to reject <strong>{rejectTarget.shopName}</strong>?
              </p>
              <Textarea
                placeholder="Enter rejection reason (required)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={handleReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merchant Detail Dialog */}
      <Dialog open={!!detailMerchant} onOpenChange={() => setDetailMerchant(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Merchant Detail</DialogTitle>
          </DialogHeader>
          {detailMerchant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Shop Name</p>
                  <p>{detailMerchant.shopName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {statusBadge(detailMerchant.licenseStatus)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Owner</p>
                  <p>{detailMerchant.user?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{detailMerchant.user?.email}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Registered</p>
                <p>{new Date(detailMerchant.createdAt).toLocaleDateString()}</p>
              </div>
              {detailMerchant.businessLicenseUrl && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Business License</p>
                  <a
                    href={detailMerchant.businessLicenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    View License
                  </a>
                </div>
              )}
              {detailMerchant.rejectionReason && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejection Reason</p>
                  <p className="text-destructive">{detailMerchant.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
