import React from 'react';
import { useTranslation } from 'react-i18next';
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
import type { AuditLogDetail } from '../services/auditLog.service';
import { formatMmt } from '../utils/datetime';
import { parseUserAgent, type UaClientType } from '../utils/userAgent';

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  merchant: 'bg-blue-100 text-blue-700 border-blue-200',
  buyer: 'bg-green-100 text-green-700 border-green-200',
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
};

const CLIENT_BADGE: Record<UaClientType, string> = {
  browser: 'bg-green-100 text-green-700 border-green-200',
  mobileApp: 'bg-blue-100 text-blue-700 border-blue-200',
  apiClient: 'bg-amber-100 text-amber-700 border-amber-200',
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
      <ul className="ms-4 space-y-1">
        {entries.map(([childKey, val]) => (
          <li key={childKey}>
            <span className="font-semibold">{humanizeKey(childKey)}</span> ={' '}
            {renderValue(childKey, val)}
          </li>
        ))}
      </ul>
    );
  }
  return String(value);
}

interface AuditLogDetailModalProps {
  open: boolean;
  onClose: () => void;
  detail?: AuditLogDetail;
  loading?: boolean;
  error?: boolean;
  onViewUserHistory?: (userId: string) => void;
  /** Kept for the page's props; unused because entity id is no longer shown. */
  onViewEntityHistory?: (entityType: string, entityId: string) => void;
}

export function AuditLogDetailModal({
  open,
  onClose,
  detail,
  loading = false,
  error = false,
  onViewUserHistory,
}: AuditLogDetailModalProps) {
  const { t } = useTranslation();
  const oldValue = detail?.oldValue ?? null;
  const newValue = detail?.newValue ?? null;
  const userAgent = detail?.userAgent ?? null;
  const parsedUa = parseUserAgent(userAgent);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {/* Mobile (<768px) full-screen modal; tablet/desktop centered modal. */}
      <DialogContent
        className="left-0 top-0 h-dvh max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0 sm:rounded-none md:left-1/2 md:top-1/2 md:h-[min(85dvh,48rem)] md:w-[min(40rem,calc(100vw_-_3rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border"
        data-testid="audit-detail-modal"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{t('audit.logDetail')}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-destructive" role="alert">
            {t('audit.detailNotFound')}
          </p>
        )}

        {detail && !loading && (
          <div className="space-y-4 text-sm">
            <section className="space-y-1.5">
              <h3 className="font-semibold">{t('audit.basicInfo')}</h3>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">
                    {t('audit.timestamp')}:
                  </span>{' '}
                  <span className="font-mono">
                    {formatMmt(detail.createdAt)}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    {t('audit.actorName')}:
                  </span>{' '}
                  {detail.userName ?? t('audit.system')}
                </p>
                {detail.userEmail && (
                  <p>
                    <span className="text-muted-foreground">
                      {t('audit.actorEmail')}:
                    </span>{' '}
                    {detail.userEmail}
                  </p>
                )}
                {detail.userRole && (
                  <div>
                    <span className="text-muted-foreground">
                      {t('audit.actorRole')}:
                    </span>{' '}
                    <Badge
                      className={ROLE_BADGE[detail.userRole] ?? undefined}
                      variant="outline"
                    >
                      {detail.userRole}
                    </Badge>
                  </div>
                )}
                <p>
                  <span className="text-muted-foreground">
                    {t('audit.action')}:
                  </span>{' '}
                  <span className="font-mono">{detail.action}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    {t('audit.entityType')}:
                  </span>{' '}
                  {detail.entityType}
                </p>
              </div>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-semibold">{t('audit.changeDetails')}</h3>
              {oldValue && (
                <div>
                  <p className="text-muted-foreground">{t('audit.oldValue')}</p>
                  <div className="max-h-40 overflow-auto rounded-md border border-border bg-muted p-2 text-xs">
                    {renderValue(null, oldValue)}
                  </div>
                </div>
              )}
              {newValue && (
                <div>
                  <p className="text-muted-foreground">{t('audit.newValue')}</p>
                  <div className="max-h-40 overflow-auto rounded-md border border-border bg-muted p-2 text-xs">
                    {renderValue(null, newValue)}
                  </div>
                </div>
              )}
              {!oldValue && !newValue && (
                <p className="text-muted-foreground">
                  {t('audit.noChangeDetails')}
                </p>
              )}
            </section>

            <section className="space-y-1.5">
              <h3 className="font-semibold">{t('audit.clientInfo')}</h3>
              <p>
                <span className="text-muted-foreground">
                  {t('audit.ipAddress')}:
                </span>{' '}
                <span className="font-mono">
                  {detail.ipAddress ?? t('audit.unknownIp')}
                </span>
              </p>
              {parsedUa && (
                <div className="space-y-1.5" data-testid="ua-parsed">
                  <div>
                    <span className="text-muted-foreground">
                      {t('audit.clientType')}:
                    </span>{' '}
                    <Badge
                      className={CLIENT_BADGE[parsedUa.clientType]}
                      variant="outline"
                    >
                      {t(CLIENT_TYPE_KEY[parsedUa.clientType])}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    <p>
                      <span className="text-muted-foreground">
                        {t('audit.clientBrowser')}:
                      </span>{' '}
                      {parsedUa.browser ?? t('audit.unknown')}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        {t('audit.clientDevice')}:
                      </span>{' '}
                      {t(DEVICE_KEY[parsedUa.device])}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {detail?.userId && onViewUserHistory && (
            <Button
              variant="outline"
              onClick={() => onViewUserHistory(detail.userId as string)}
              data-testid="btn-view-user-history"
            >
              {t('audit.viewUserHistory')}
            </Button>
          )}
          <Button onClick={onClose} data-testid="btn-close-modal">
            {t('audit.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
