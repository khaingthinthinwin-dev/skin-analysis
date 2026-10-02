import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getAllAdminOrders } from '../services/adminOrderService';
import { buildAdminOrdersExportFilename, exportAdminOrdersCsv } from '../utils/exportAdminOrdersCsv';
import { formatStatusLabel } from '../utils/orderStatusLabel';
import type { AdminOrderFilterFormData } from '../schemas/orderFilters.schema';

interface ExportAdminOrdersDialogProps {
  filters: AdminOrderFilterFormData;
  total: number;
  onClose: () => void;
}

export function ExportAdminOrdersDialog({ filters, total, onClose }: ExportAdminOrdersDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(false);
  const statusLabel = filters.status === 'all' ? 'All' : formatStatusLabel(filters.status);
  const paymentLabel = filters.paymentStatus === 'all' ? 'All' : filters.paymentStatus;
  const dateLabel = filters.from || filters.to
    ? `${filters.from?.slice(0, 10).replaceAll('-', '/') ?? 'Any date'} to ${filters.to?.slice(0, 10).replaceAll('-', '/') ?? 'Any date'}`
    : 'All dates';

  const handleExport = async () => {
    setIsExporting(true);
    setError(false);
    try {
      const rows = await getAllAdminOrders(filters);
      if (rows.length) exportAdminOrdersCsv(rows, buildAdminOrdersExportFilename(filters));
      onClose();
    } catch {
      setError(true);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isExporting) onClose(); }}>
      <DialogContent aria-modal="true" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Orders</DialogTitle>
          <DialogDescription>The CSV will include orders matching your current filters.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Export Scope</p>
            <p className="text-sm text-muted-foreground">Status: <span className="font-medium text-foreground">{statusLabel}</span></p>
            <p className="text-sm text-muted-foreground">Payment: <span className="font-medium text-foreground">{paymentLabel}</span></p>
            <p className="text-sm text-muted-foreground">Date Range: <span className="font-medium text-foreground">{dateLabel}</span></p>
            {(filters.shopSearch || filters.merchantId || filters.shopId) && (
              <p className="text-sm text-muted-foreground">Shop / Merchant: <span className="font-medium text-foreground">{filters.shopSearch || 'Selected shop or merchant'}</span></p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Result: <span className="font-medium text-foreground">{total}</span> orders within this scope</p>
          {total === 0 && <p className="text-sm text-muted-foreground" role="status">No matching orders.</p>}
          {error && <p className="text-sm text-destructive" role="alert">Unable to export orders. Please try again.</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isExporting}>Cancel</Button>
          <Button type="button" onClick={() => void handleExport()} disabled={isExporting || total === 0}>
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
