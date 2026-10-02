import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  auditLogQuerySchema,
  DEFAULT_AUDIT_LOG_QUERY,
  type AuditLogQueryState,
} from '../schemas/auditLog.schema';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getAllowed(params: URLSearchParams, key: string): string[] {
  return params.getAll(key).filter((v) => v !== '');
}

function optionalUuid(value: string | null | undefined): string | undefined {
  return value && UUID_RE.test(value) ? value : undefined;
}

function optionalDateRange(
  dateFrom: string | null,
  dateTo: string | null,
): { dateFrom?: string; dateTo?: string } {
  if (!dateFrom || !dateTo) return {};
  if (dateTo < dateFrom) return {};
  return { dateFrom, dateTo };
}

export function parseAuditLogQuery(searchParams: URLSearchParams): AuditLogQueryState {
  const raw: Record<string, unknown> = {
    userId: optionalUuid(searchParams.get('userId')),
    action: getAllowed(searchParams, 'action'),
    entityType: getAllowed(searchParams, 'entityType'),
    entityId: optionalUuid(searchParams.get('entityId')),
    ...optionalDateRange(searchParams.get('dateFrom'), searchParams.get('dateTo')),
    ipAddress: searchParams.get('ipAddress') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    page: searchParams.get('page') ?? DEFAULT_AUDIT_LOG_QUERY.page,
    limit: searchParams.get('limit') ?? DEFAULT_AUDIT_LOG_QUERY.limit,
    sortBy: searchParams.get('sortBy') ?? DEFAULT_AUDIT_LOG_QUERY.sortBy,
    sortOrder: searchParams.get('sortOrder') ?? DEFAULT_AUDIT_LOG_QUERY.sortOrder,
  };

  if ((raw.action as string[]).length === 0) delete raw.action;
  if ((raw.entityType as string[]).length === 0) delete raw.entityType;
  for (const key of ['userId', 'entityId', 'dateFrom', 'dateTo'] as const) {
    if (raw[key] === undefined) delete raw[key];
  }

  const parsed = auditLogQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return { ...DEFAULT_AUDIT_LOG_QUERY };
  }
  return {
    ...DEFAULT_AUDIT_LOG_QUERY,
    ...parsed.data,
    action: parsed.data.action?.length ? parsed.data.action : undefined,
    entityType: parsed.data.entityType?.length
      ? parsed.data.entityType
      : undefined,
  };
}

export function countActiveFilters(query: AuditLogQueryState): number {
  let count = 0;
  if (query.userId) count += 1;
  if (query.action?.length) count += 1;
  if (query.entityType?.length) count += 1;
  if (query.entityId) count += 1;
  if (query.dateFrom || query.dateTo) count += 1;
  if (query.ipAddress) count += 1;
  if (query.search) count += 1;
  return count;
}

type FilterPatch = Partial<
  Pick<
    AuditLogQueryState,
    | 'userId'
    | 'action'
    | 'entityType'
    | 'entityId'
    | 'dateFrom'
    | 'dateTo'
    | 'ipAddress'
    | 'search'
    | 'page'
    | 'limit'
    | 'sortBy'
    | 'sortOrder'
  >
>;

export function useAuditLogQuery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const query = useMemo(
    () => parseAuditLogQuery(new URLSearchParams(queryString)),
    [queryString],
  );
  const activeFilterCount = useMemo(() => countActiveFilters(query), [query]);

  const patch = useCallback(
    (values: FilterPatch, options?: { resetPage?: boolean }) => {
      const resetPage = options?.resetPage ?? true;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(values)) {
            if (Array.isArray(value)) {
              next.delete(key);
              for (const item of value) next.append(key, item);
            } else if (value === undefined || value === null || value === '') {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          if (resetPage && !('page' in values)) {
            next.set('page', '1');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams();
        const page = prev.get('page');
        const limit = prev.get('limit');
        const sortBy = prev.get('sortBy');
        const sortOrder = prev.get('sortOrder');
        if (page) next.set('page', page);
        if (limit) next.set('limit', limit);
        if (sortBy) next.set('sortBy', sortBy);
        if (sortOrder) next.set('sortOrder', sortOrder);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return { searchParams, query, patch, clearFilters, activeFilterCount };
}
