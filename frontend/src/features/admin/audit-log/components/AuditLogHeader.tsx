import { useTranslation } from 'react-i18next';
import { ShieldCheck, Download, Trash2, RefreshCw } from 'lucide-react';
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
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between border-b border-border/60 pb-5">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t('audit.title')}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground pl-0.5">
          {t('audit.subtitle')}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card/60 px-3.5 py-2 text-xs font-medium shadow-2xs backdrop-blur-xs">
          <Switch
            checked={autoRefresh}
            onCheckedChange={onAutoRefreshChange}
            aria-label={t('audit.autoRefresh')}
            data-testid="tgl-auto-refresh"
          />
          <span className="flex items-center gap-1.5 text-foreground/90 font-medium">
            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${autoRefresh ? 'animate-spin text-primary' : ''}`} />
            {t('audit.autoRefresh')}
          </span>
          {autoRefresh && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
        </div>

        <Button
          variant="outline"
          size="default"
          onClick={onExport}
          disabled={exportPending}
          data-testid="btn-export-csv"
          className="gap-2 shadow-2xs font-medium hover:bg-primary/5 hover:text-primary transition-all"
        >
          <Download className="h-4 w-4" />
          {exportPending ? t('audit.exporting') : t('audit.exportCsv')}
        </Button>

        <Button
          variant="destructive"
          size="default"
          onClick={onDelete}
          data-testid="btn-delete-logs"
          className="gap-2 shadow-2xs font-medium transition-all"
        >
          <Trash2 className="h-4 w-4" />
          {t('audit.deleteLogs')}
        </Button>
      </div>
    </div>
  );
}

