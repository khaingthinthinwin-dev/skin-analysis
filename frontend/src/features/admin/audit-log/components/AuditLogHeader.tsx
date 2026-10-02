import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface AuditLogHeaderProps {
  autoRefresh: boolean;
  onAutoRefreshChange: (next: boolean) => void;
  onExport: () => void;
  onDelete: () => void;
  exportPending?: boolean;
}

export function AuditLogHeader({
  autoRefresh,
  onAutoRefreshChange,
  onExport,
  onDelete,
  exportPending = false,
}: AuditLogHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
          {t('audit.title')}
        </h1>
        <p className="text-muted-foreground">{t('audit.subtitle')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Switch
            checked={autoRefresh}
            onCheckedChange={onAutoRefreshChange}
            aria-label={t('audit.autoRefresh')}
            data-testid="tgl-auto-refresh"
          />
          {t('audit.autoRefresh')}
        </label>
        <Button
          variant="default"
          onClick={onExport}
          disabled={exportPending}
          data-testid="btn-export-csv"
        >
          {exportPending ? t('audit.exporting') : t('audit.exportCsv')}
        </Button>
        <Button
          variant="destructive"
          onClick={onDelete}
          data-testid="btn-delete-logs"
        >
          {t('audit.deleteLogs')}
        </Button>
      </div>
    </div>
  );
}
