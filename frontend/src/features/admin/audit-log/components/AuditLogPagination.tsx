import { PaginationControls } from '@/components/PaginationControls';
import { AUDIT_LOG_PAGE_SIZES } from '../schemas/auditLog.schema';

interface AuditLogPaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function AuditLogPagination({
  page,
  limit,
  totalPages,
  onPageChange,
  onLimitChange,
}: AuditLogPaginationProps) {
  return (
    <PaginationControls
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      limit={limit}
      onLimitChange={onLimitChange}
      pageSizeOptions={[...AUDIT_LOG_PAGE_SIZES]}
    />
  );
}
