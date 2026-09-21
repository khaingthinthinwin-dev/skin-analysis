import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { useOrderListFilters } from './useOrderListFilters';
import { useOrderQueryParams } from './useOrderQueryParams';

function QueryProbe() {
  const { searchParams, patch } = useOrderQueryParams();

  return (
    <>
      <output data-testid="query">{searchParams.toString()}</output>
      <button onClick={() => patch({ status: 'packed', from: '2026-08-01', to: '2026-08-31' })}>
        apply
      </button>
      <button onClick={() => patch({ status: '', from: '', to: '' })}>
        clear
      </button>
    </>
  );
}

describe('Order Insights query filters', () => {
  it('hydrates status and date filters from a direct URL load', async () => {
    const { result } = renderHook(() => useOrderListFilters(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[{
          pathname: '/orders',
          search: '?status=packed&from=2026-08-01&to=2026-08-31&page=1&limit=20&sort=createdAt&order=desc',
        }]}>
          {children}
        </MemoryRouter>
      ),
    });

    expect(result.current.methods.getValues()).toMatchObject({
      status: 'packed',
      from: '2026-08-01',
      to: '2026-08-31',
    });

    await vi.waitFor(() => {
      expect(result.current.methods.getValues()).toMatchObject({
        status: 'packed',
        from: '2026-08-01',
        to: '2026-08-31',
        page: 1,
        limit: 20,
        sort: 'createdAt',
        order: 'desc',
      });
    });
  });

  it('applies and clears status and date values in the URL', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/orders']}>
        <QueryProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'apply' }));
    expect(screen.getByTestId('query')).toHaveTextContent('status=packed&from=2026-08-01&to=2026-08-31');

    await user.click(screen.getByRole('button', { name: 'clear' }));
    expect(screen.getByTestId('query')).toHaveTextContent('');
  });
});
