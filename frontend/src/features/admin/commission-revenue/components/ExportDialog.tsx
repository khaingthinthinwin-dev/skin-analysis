import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  CommissionGroupBy,
  PayoutMerchant,
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
  initialValues?: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: CommissionGroupBy;
  };
  merchants?: PayoutMerchant[];
}

const REPORT_LABEL_KEYS: Record<ExportReportType, string> = {
  commission: 'admin.commission.reportTypes.commission',
  revenue: 'admin.commission.reportTypes.revenue',
  payout: 'admin.commission.reportTypes.payout',
};

// [S] Export modal (DD_02). Shared across both tabs. Selects a date range and
// CSV/Excel format, then streams the generated file to the client.
export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onOpenChange,
  reportType,
  onGenerated,
  initialValues,
  merchants = [],
}) => {
  const { t } = useTranslation();
  const reportLabel = t(REPORT_LABEL_KEYS[reportType], reportType);
  const [dateFrom, setDateFrom] = useState(initialValues?.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(initialValues?.dateTo ?? '');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [groupBy] = useState<CommissionGroupBy>(initialValues?.groupBy ?? 'merchant');
  const [merchantId, setMerchantId] = useState<string>('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const validate = (): ExportRequestBody | null => {
    if (!dateFrom || !dateTo) {
      setError(t('admin.commission.export.validation.dateRequired', 'Please select a start and end date.'));
      return null;
    }
    if (new Date(dateFrom) > new Date(dateTo)) {
      setError(t('admin.commission.export.validation.dateOrder', 'End date must be after start date.'));
      return null;
    }
    const diff = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
    if (diff > 365 * 24 * 60 * 60 * 1000) {
      setError(t('admin.commission.export.validation.maxRange', 'Date range cannot exceed 365 days.'));
      return null;
    }
    setError('');
    return {
      dateFrom,
      dateTo,
      format,
      ...(reportType === 'commission' ? { groupBy } : {}),
      ...(reportType === 'payout' && merchantId ? { merchantId } : {}),
    };
  };

  const handleGenerate = async () => {
    const body = validate();
    if (!body) return;
    setGenerating(true);
    try {
      const selectedMerchantName = merchants.find((merchant) => merchant.id === merchantId)?.name;
      await commissionService.exportReport(reportType, body, selectedMerchantName);
      toast({
        title: t('admin.commission.export.successTitle', 'Export generated'),
        description: t('admin.commission.export.successDescription', '{{reportType}} report is downloading.', { reportType: reportLabel }),
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
      toast({ title: t('admin.commission.export.failed', 'Export failed'), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.commission.export.title', 'Export Report')}</DialogTitle>
          <DialogDescription>
            {t('admin.commission.export.description', 'Download a {{reportType}} report for the selected date range.', { reportType: reportLabel })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('admin.commission.export.reportType', 'Report Type')}</span>
            <span className="font-medium">{reportLabel}</span>
          </div>
          {reportType === 'commission' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('admin.commission.export.groupBy', 'Group By')}</span>
              <span className="font-medium capitalize">{t(`admin.commission.groupBy.${groupBy}`, groupBy)}</span>
            </div>
          )}
          {reportType === 'payout' && merchants.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t('admin.commission.payout.merchant', 'Merchant')}</span>
              <select
                className="flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
              >
                <option value="">{t('admin.commission.export.allMerchants', 'All Merchants')}</option>
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t('admin.commission.export.startDate', 'Start Date')}</span>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t('admin.commission.export.endDate', 'End Date')}</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
           <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">{t('admin.commission.export.format', 'Format')}</span>
            <div className="flex gap-2" role="radiogroup" aria-label={t('admin.commission.export.formatLabel', 'Export format')}>
              <Button
                type="button"
                size="sm"
                variant={format === 'csv' ? 'default' : 'outline'}
                aria-pressed={format === 'csv'}
                onClick={() => setFormat('csv')}
              >
                CSV
              </Button>
              <Button
                type="button"
                size="sm"
                variant={format === 'xlsx' ? 'default' : 'outline'}
                aria-pressed={format === 'xlsx'}
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
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? t('admin.commission.export.generating', 'Generating...') : t('admin.commission.export.generate', 'Generate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
