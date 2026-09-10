import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { matchQuerySchema, type MatchQueryParams } from '@/schemas/matching.schema';

export function useMatchFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: MatchQueryParams = useMemo(
    () => matchQuerySchema.parse(Object.fromEntries(searchParams)),
    [searchParams],
  );

  const updateFilters = useCallback((updates: Partial<MatchQueryParams>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });

      if (Object.keys(updates).some((k) => k !== 'page')) {
        next.set('page', '1');
      }

      return next;
    });
  }, [setSearchParams]);

  const resetFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return { filters, updateFilters, resetFilters };
}
