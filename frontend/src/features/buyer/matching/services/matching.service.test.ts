import { beforeEach, describe, expect, it, vi } from 'vitest';
import { matchingService } from './matching.service';

vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn(),
  },
}));

import apiClient from '@/lib/api-client';

describe('matchingService.getPersonalized', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends page and limit query params for page 2', async () => {
    (apiClient.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { data: [], meta: { page: 2, limit: 12, total: 30, totalPages: 3 } } },
    });

    await matchingService.getPersonalized({
      page: 2,
      limit: 12,
      sort: 'createdAt',
      order: 'desc',
      categoryId: undefined,
      skinTypes: undefined,
    });

    const calledUrl = (apiClient.get as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('limit=12');
  });

  it('keeps the limit when page changes', async () => {
    (apiClient.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { data: [], meta: { page: 1, limit: 12, total: 30, totalPages: 3 } } },
    });

    await matchingService.getPersonalized({
      page: 1,
      limit: 12,
      sort: 'createdAt',
      order: 'desc',
      categoryId: undefined,
      skinTypes: undefined,
    });

    const firstUrl = (apiClient.get as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(firstUrl).toContain('page=1');
    expect(firstUrl).toContain('limit=12');
  });
});