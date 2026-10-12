import { useQuery } from '@tanstack/react-query';
import { searchAdminMerchants } from '../services/adminOrderService';
import type { AdminMerchantOption } from '../types/adminOrderInsights.types';

/**
 * Type-ahead options for the admin shop filter.
 *
 * The query stays disabled until the admin has typed at least one character, so
 * opening the list never dumps an arbitrary page of shops on them. `staleTime`
 * keeps a re-opened dropdown from re-requesting the same term on every keystroke.
 */
export function useAdminMerchantOptions(search: string) {
  const term = search.trim();

  return useQuery<AdminMerchantOption[], Error>({
    queryKey: ['adminMerchantOptions', term],
    queryFn: () => searchAdminMerchants(term),
    enabled: term.length > 0,
    staleTime: 60_000,
  });
}