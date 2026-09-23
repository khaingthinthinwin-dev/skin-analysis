import { useMemo, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';
import { matchQuerySchema, type MatchQueryParams } from '@/schemas/matching.schema';

export function useMatchFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Bumped on every "Show" page-size selection so the product fetch is always
  // re-run, even when the same value (e.g. 12) is selected again and the URL
  // would otherwise be unchanged.
  const [pageSizeVersion, setPageSizeVersion] = useState(0);

  const filters: MatchQueryParams = useMemo(
    () => matchQuerySchema.parse(Object.fromEntries(searchParams)),
    [searchParams],
  );

  const updateFilters = useCallback(
    (updates: Partial<MatchQueryParams>) => {
      const next: MatchQueryParams = {
        ...filters,
        ...updates,
        page: Object.keys(updates).some((k) => k !== 'page')
          ? 1
          : (updates.page ?? filters.page),
      };
      setSearchParams(serializeMatchParams(next), { replace: true });
    },
    [filters, setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const handleLimitChange = useCallback(
    (limit: number) => {
      // Always reset to page 1 and keep all filters/sorting conditions.
      // Bumping the version guarantees the fetching logic runs even when the
      // same limit is re-selected (the serialized URL is unchanged in that
      // case, so the query key would otherwise stay identical and TanStack
      // Query would skip the request).
      setPageSizeVersion((version) => version + 1);
      updateFilters({ limit, page: 1 });
    },
    [updateFilters],
  );

  return { filters, updateFilters, resetFilters, handleLimitChange, pageSizeVersion };
}

function serializeMatchParams(params: MatchQueryParams): Record<string, string> {
  const entries: [string, string][] = [];
  if (params.categoryId) entries.push(['categoryId', params.categoryId]);
  if (params.skinTypes && params.skinTypes.trim() !== '' && params.skinTypes !== 'all') {
    entries.push(['skinTypes', params.skinTypes]);
  }
  if (params.ingredients) entries.push(['ingredients', params.ingredients]);
  if (params.minPrice !== undefined) entries.push(['minPrice', String(params.minPrice)]);
  if (params.maxPrice !== undefined) entries.push(['maxPrice', String(params.maxPrice)]);
  if (params.rating !== undefined) entries.push(['rating', String(params.rating)]);
  if (params.sort !== 'createdAt') entries.push(['sort', params.sort]);
  if (params.order !== 'desc') entries.push(['order', params.order]);
  entries.push(['page', String(params.page)]);
  entries.push(['limit', String(params.limit)]);
  return Object.fromEntries(entries);
}