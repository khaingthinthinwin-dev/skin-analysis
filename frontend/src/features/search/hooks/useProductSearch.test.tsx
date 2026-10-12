import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { productService } from '../services/product.service'
import { useProductSearch } from './useProductSearch'

describe('useProductSearch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not fetch while disabled and starts fetching when enabled', async () => {
    const search = vi.spyOn(productService, 'search').mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
    })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )

    const { rerender } = renderHook(
      ({ enabled }) => useProductSearch(enabled),
      { initialProps: { enabled: false }, wrapper },
    )

    expect(search).not.toHaveBeenCalled()

    rerender({ enabled: true })

    await waitFor(() => expect(search).toHaveBeenCalledTimes(1))
  })
})
