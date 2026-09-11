import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import {
  commissionService,
  ExportReportType,
  ExportFormat,
  ExportRequestBody,
} from '../services/commission.service';

export interface ExportRecord {
  reportType: ExportReportType;
  format: ExportFormat;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: ExportReportType;
  onGenerated?: (rec: ExportRecord) => void;
}

const REPORT_LABELS: Record<ExportReportType, string> = {
  commission: 'Commission',
  revenue: 'Revenue',
  payout: 'Payout',
};

// [S] Export modal (DD_02). Shared across both tabs. Selects a date range and
// CSV/Excel format, then streams the generated file to the client.
export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onOpenChange,
  reportType,
  onGenerated,
}) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  

  const validate = (): ExportRequestBody | null => {
    if (!dateFrom || !dateTo) {
      setError('Please select a start and end date.');
      return null;
    }
    if (new Date(dateFrom) > new Date(dateTo)) {
      setError('End date must be after start date.');
      return null;
    }
    const diff = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
    if (diff > 365 * 24 * 60 * 60 * 1000) {
      setError('Date range cannot exceed 365 days.');
      return null;
    }
    setError('');
    return { dateFrom, dateTo, format };
  };

  const handleGenerate = async () => {
    const body = validate();
    if (!body) return;
    setGenerating(true);
    try {
      await commissionService.exportReport(reportType, body);
      toast({
        title: 'Export generated',
        description: `${REPORT_LABELS[reportType]} report is downloading.`,
      });
      onGenerated?.({
        reportType,
        format,
        dateFrom,
        dateTo,
        generatedAt: new Date().toISOString(),
      });
      onOpenChange(false);
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Report</DialogTitle>
          <DialogDescription>
            Download a {REPORT_LABELS[reportType]} report for the selected date range.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Report Type</span>
            <span className="font-medium">{REPORT_LABELS[reportType]}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Start Date</span>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">End Date</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Format</span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={format === 'csv' ? 'default' : 'outline'}
                onClick={() => setFormat('csv')}
              >
                CSV
              </Button>
              <Button
                type="button"
                size="sm"
                variant={format === 'xlsx' ? 'default' : 'outline'}
                onClick={() => setFormat('xlsx')}
              >
                Excel
              </Button>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
