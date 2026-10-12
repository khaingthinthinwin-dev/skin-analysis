import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollText, Clock, User, Mail, Shield, Tag, Monitor, Globe, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import type { AuditLogDetail } from '../services/auditLog.service';
import { formatMmt } from '../utils/datetime';
import { parseUserAgent, type UaClientType } from '../utils/userAgent';

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  merchant: 'bg-blue-50 text-blue-700 border-blue-200',
  buyer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  super_admin: 'bg-purple-50 text-purple-700 border-purple-200',
};

const CLIENT_BADGE: Record<UaClientType, string> = {
  browser: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  mobileApp: 'bg-blue-50 text-blue-700 border-blue-200',
  apiClient: 'bg-amber-50 text-amber-700 border-amber-200',
  unknown: 'bg-muted text-muted-foreground border-border',
};

const CLIENT_TYPE_KEY: Record<UaClientType, string> = {
  browser: 'audit.clientTypeBrowser',
  mobileApp: 'audit.clientTypeMobileApp',
  apiClient: 'audit.clientTypeApi',
  unknown: 'audit.unknown',
};

const DEVICE_KEY: Record<string, string> = {
  desktop: 'audit.deviceDesktop',
  mobile: 'audit.deviceMobile',
  tablet: 'audit.deviceTablet',
  other: 'audit.deviceOther',
  unknown: 'audit.unknown',
};

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}

const NUMBER_FORMAT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const PERCENT_WORDS = new Set([
  'rate',
  'rates',
  'percent',
  'percentage',
  'pct',
  'ratio',
]);

const CURRENCY_WORDS = new Set([
  'amount',
  'price',
  'cost',
  'fee',
  'balance',
  'revenue',
  'target',
  'commission',
  'payout',
  'salary',
  'wage',
  'tax',
  'budget',
  'total',
  'refund',
  'income',
  'credit',
  'debit',
  'fund',
  'sales',
]);

function keyWordSet(key: string | null): Set<string> {
  if (!key) return new Set();
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return new Set(words);
}

function toNumber(value: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatScalar(key: string | null, value: string | number): string {
  const words = keyWordSet(key);
  const isPercent = [...words].some((word) => PERCENT_WORDS.has(word));
  const isCurrency = [...words].some((word) => CURRENCY_WORDS.has(word));

  if (typeof value === 'string' && value.includes('%')) {
    const parsed = toNumber(value.replace(/%/g, ''));
    return parsed === null ? value : `${NUMBER_FORMAT.format(parsed)}%`;
  }

  const parsed = toNumber(value);
  if (parsed === null) {
    return typeof value === 'string' ? value : String(value);
  }

  if (isPercent) return `${NUMBER_FORMAT.format(parsed)}%`;

  const hasDecimal =
    typeof value === 'number' ? !Number.isInteger(value) : value.includes('.');
  if (isCurrency || hasDecimal) return NUMBER_FORMAT.format(parsed);

  return typeof value === 'string' ? value : String(value);
}

function renderValue(key: string | null, value: unknown): React.ReactNode {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number') {
    return formatScalar(key, value);
  }
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map((item, index) => (
      <React.Fragment key={index}>
        {index > 0 && ', '}
        {renderValue(key, item)}
      </React.Fragment>
    ));
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '—';
    return (
      <ul className="space-y-1">
        {entries.map(([childKey, val]) => (
          <li key={childKey} className="flex items-baseline gap-2">
            <span className="text-muted-foreground font-medium">{humanizeKey(childKey)}</span>
            <span className="font-mono text-xs">{renderValue(childKey, val)}</span>
          </li>
        ))}
      </ul>
    );
  }
  return String(value);
}

function InfoRow({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      {Icon && (
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}:
        </span>
        <div className="mt-0.5 text-sm break-words">{children}</div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

interface AuditLogDetailModalProps {
  open: boolean;
  onClose: () => void;
  detail?: AuditLogDetail;
  loading?: boolean;
  error?: boolean;
}

export function AuditLogDetailModal({
  open,
  onClose,
  detail,
  loading = false,
  error = false,
}: AuditLogDetailModalProps) {
  const { t } = useTranslation();
  const oldValue = detail?.oldValue ?? null;
  const newValue = detail?.newValue ?? null;
  const userAgent = detail?.userAgent ?? null;
  const parsedUa = parseUserAgent(userAgent);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="left-0 top-0 h-dvh max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0 sm:rounded-none md:left-1/2 md:top-1/2 md:h-[min(85dvh,48rem)] md:w-[min(40rem,calc(100vw_-_3rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border md:shadow-2xl"
        data-testid="audit-detail-modal"
        aria-describedby={undefined}
      >
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg">{t('audit.logDetail')}</DialogTitle>
          </div>
        </DialogHeader>

        <Separator />

        {loading && (
          <div className="space-y-4 py-4" aria-busy="true">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-32 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
            </div>
            <span className="sr-only">{t('audit.loading')}</span>
          </div>
        )}

        {error && !loading && (
          <div className="py-8 text-center">
            <p className="text-sm text-destructive" role="alert">
              {t('audit.detailNotFound')}
            </p>
          </div>
        )}

        {detail && !loading && (
          <div className="space-y-4 py-4">
            <SectionCard title={t('audit.basicInfo')} icon={User}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoRow icon={Clock} label={t('audit.timestamp')}>
                  <span className="font-mono text-xs">{formatMmt(detail.createdAt)}</span>
                </InfoRow>
                <InfoRow icon={User} label={t('audit.actorName')}>
                  {detail.userName ?? t('audit.system')}
                </InfoRow>
                {detail.userEmail && (
                  <InfoRow icon={Mail} label={t('audit.actorEmail')}>
                    <span className="break-all">{detail.userEmail}</span>
                  </InfoRow>
                )}
                {detail.userRole && (
                  <InfoRow icon={Shield} label={t('audit.actorRole')}>
                    <Badge
                      className={ROLE_BADGE[detail.userRole] ?? undefined}
                      variant="outline"
                    >
                      {detail.userRole}
                    </Badge>
                  </InfoRow>
                )}
                <InfoRow icon={Tag} label={t('audit.action')}>
                  <span className="font-mono text-xs">{detail.action}</span>
                </InfoRow>
                <InfoRow icon={Globe} label={t('audit.entityType')}>
                  {detail.entityType}
                </InfoRow>
              </div>
            </SectionCard>

            <SectionCard title={t('audit.changeDetails')} icon={ScrollText}>
              {oldValue && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('audit.oldValue')}</p>
                  <div className="max-h-40 overflow-auto rounded-md border border-border/50 bg-muted/30 p-3 text-xs">
                    {renderValue(null, oldValue)}
                  </div>
                </div>
              )}
              {newValue && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('audit.newValue')}</p>
                  <div className="max-h-40 overflow-auto rounded-md border border-border/50 bg-muted/30 p-3 text-xs">
                    {renderValue(null, newValue)}
                  </div>
                </div>
              )}
              {!oldValue && !newValue && (
                <p className="text-sm text-muted-foreground">
                  {t('audit.noChangeDetails')}
                </p>
              )}
            </SectionCard>

            <SectionCard title={t('audit.clientInfo')} icon={Monitor}>
              <div className="space-y-3">
                <InfoRow icon={Wifi} label={t('audit.ipAddress')}>
                  <span className="font-mono text-xs">
                    {detail.ipAddress ?? t('audit.unknownIp')}
                  </span>
                </InfoRow>
                {parsedUa && (
                  <div className="space-y-3 rounded-md border border-border/50 bg-muted/20 p-3" data-testid="ua-parsed">
                    <InfoRow icon={Monitor} label={t('audit.clientType')}>
                      <Badge
                        className={CLIENT_BADGE[parsedUa.clientType]}
                        variant="outline"
                      >
                        {t(CLIENT_TYPE_KEY[parsedUa.clientType])}
                      </Badge>
                    </InfoRow>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoRow label={t('audit.clientBrowser')}>
                        <span className="break-all">{parsedUa.browser ?? t('audit.unknown')}</span>
                      </InfoRow>
                      <InfoRow label={t('audit.clientDevice')}>
                        {t(DEVICE_KEY[parsedUa.device])}
                      </InfoRow>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        )}

        <Separator />

        <DialogFooter className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose} data-testid="btn-close-modal">
            {t('audit.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
