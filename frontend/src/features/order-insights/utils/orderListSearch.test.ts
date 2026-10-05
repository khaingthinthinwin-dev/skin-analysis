import { describe, expect, it } from 'vitest';
import { sanitizeListSearch } from './orderListSearch';

describe('sanitizeListSearch', () => {
  it('keeps known list params verbatim', () => {
    expect(sanitizeListSearch('?status=delivered&page=2')).toBe('status=delivered&page=2');
    expect(sanitizeListSearch('limit=10&sort=totalAmount&order=asc')).toBe(
      'limit=10&sort=totalAmount&order=asc',
    );
    expect(sanitizeListSearch('?from=2026-09-01&to=2026-09-30')).toBe(
      'from=2026-09-01&to=2026-09-30',
    );
  });

  it('drops unknown params so a crafted value cannot be injected', () => {
    expect(sanitizeListSearch('?status=delivered&evil=1&utm_source=x')).toBe('status=delivered');
  });

  it('rejects invalid values entirely so the link falls back to the plain list', () => {
    expect(sanitizeListSearch('?status=hacked')).toBe('');
    expect(sanitizeListSearch('?page=abc')).toBe('');
    expect(sanitizeListSearch('?from=2026-09-30&to=2026-09-01')).toBe('');
  });

  it('handles non-string, empty and unknown-only input', () => {
    expect(sanitizeListSearch(undefined)).toBe('');
    expect(sanitizeListSearch('')).toBe('');
    expect(sanitizeListSearch('?foo=bar')).toBe('');
  });
});