import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useMatchFilters } from './useMatchFilters';

function MatchProbe() {
  const { filters, updateFilters, resetFilters } = useMatchFilters();

  return (
    <>
      <output data-testid="page">{filters.page}</output>
      <output data-testid="limit">{filters.limit}</output>
      <output data-testid="sort">{filters.sort}</output>
      <output data-testid="order">{filters.order}</output>
      <button onClick={() => updateFilters({ page: (filters.page ?? 1) + 1 })}>
        next
      </button>
      <button onClick={() => updateFilters({ page: Math.max(1, (filters.page ?? 1) - 1) })}>
        prev
      </button>
      <button onClick={() => updateFilters({ sort: 'price', order: 'asc' })}>
        sort
      </button>
      <button onClick={resetFilters}>reset</button>
    </>
  );
}

describe('useMatchFilters pagination', () => {
  it('starts at page 1 with limit 12 from a clean URL', () => {
    render(
      <MemoryRouter initialEntries={['/buyer/recommendations']}>
        <MatchProbe />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('page')).toHaveTextContent('1');
    expect(screen.getByTestId('limit')).toHaveTextContent('12');
  });

  it('defaults the sort to Newest (createdAt desc) from a clean URL', () => {
    render(
      <MemoryRouter initialEntries={['/buyer/recommendations']}>
        <MatchProbe />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('sort')).toHaveTextContent('createdAt');
    expect(screen.getByTestId('order')).toHaveTextContent('desc');
  });

  it('keeps limit and goes to page 2 when Next is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/buyer/recommendations?page=1&limit=12&sort=createdAt&order=desc']}>
        <MatchProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'next' }));

    expect(screen.getByTestId('page')).toHaveTextContent('2');
    expect(screen.getByTestId('limit')).toHaveTextContent('12');
    expect(screen.getByTestId('sort')).toHaveTextContent('createdAt');
    expect(screen.getByTestId('order')).toHaveTextContent('desc');
  });

  it('keeps limit when navigating back to page 1', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/buyer/recommendations?page=2&limit=12']}>
        <MatchProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'prev' }));

    expect(screen.getByTestId('page')).toHaveTextContent('1');
    expect(screen.getByTestId('limit')).toHaveTextContent('12');
  });

  it('resets to page 1 when a filter/sort is changed', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/buyer/recommendations?page=2&limit=12']}>
        <MatchProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'sort' }));

    expect(screen.getByTestId('page')).toHaveTextContent('1');
    expect(screen.getByTestId('limit')).toHaveTextContent('12');
  });

  it('keeps filters and sort when jumping to a specific page', async () => {
    const user = userEvent.setup();

    function JumpProbe() {
      const { filters, updateFilters } = useMatchFilters();
      return (
        <>
          <output data-testid="page">{filters.page}</output>
          <output data-testid="skinTypes">{filters.skinTypes ?? ''}</output>
          <output data-testid="categoryId">{filters.categoryId ?? ''}</output>
          <output data-testid="sort">{filters.sort}</output>
          <output data-testid="order">{filters.order}</output>
          <output data-testid="limit">{filters.limit}</output>
          <output data-testid="rating">{filters.rating ?? ''}</output>
          <button onClick={() => updateFilters({ page: 5 })}>page5</button>
        </>
      );
    }

    render(
      <MemoryRouter initialEntries={['/buyer/recommendations?skinTypes=oily&categoryId=cat-1&sort=price&order=asc&limit=24&rating=4&page=1']}>
        <JumpProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'page5' }));

    expect(screen.getByTestId('page')).toHaveTextContent('5');
    expect(screen.getByTestId('skinTypes')).toHaveTextContent('oily');
    expect(screen.getByTestId('categoryId')).toHaveTextContent('cat-1');
    expect(screen.getByTestId('sort')).toHaveTextContent('price');
    expect(screen.getByTestId('order')).toHaveTextContent('asc');
    expect(screen.getByTestId('limit')).toHaveTextContent('24');
    expect(screen.getByTestId('rating')).toHaveTextContent('4');
  });
});