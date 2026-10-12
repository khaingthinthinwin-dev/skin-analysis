import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { matchQuerySchema, type MatchQueryParams } from '@/schemas/matching.schema';

export function useMatchFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: MatchQueryParams = useMemo(
    () => matchQuerySchema.parse(Object.fromEntries(searchParams)),
    [searchParams],
  );

  const updateFilters = useCallback(
    (updates: Partial<MatchQueryParams>, options?: { replace?: boolean; keepPage?: boolean }) => {
      setSearchParams(
        (prev: URLSearchParams) => {
          const next = new URLSearchParams(prev);

          Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });

          // A sort/filter change restarts at page 1 — unless the caller is only
          // persisting the current selection (e.g. pinning the default sort on
          // load), where the current page must survive a refresh.
          if (!options?.keepPage && Object.keys(updates).some((k) => k !== 'page')) {
            next.set('page', '1');
          }

          return next;
        },
        { replace: options?.replace ?? false },
      );
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return { filters, updateFilters, resetFilters };
}
