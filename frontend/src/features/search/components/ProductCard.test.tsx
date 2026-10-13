import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ProductCard } from './ProductCard'

const product = {
  id: 'p1',
  name: 'Glow Serum',
  slug: 'glow-serum',
  shortDescription: 'Brightening serum',
  price: '12000',
  compareAtPrice: '30000',
  images: [],
  skinTypes: ['Dry'],
  tags: [],
  avgRating: '4.5',
  reviewCount: 12,
  isInStock: true,
  category: { id: 'cat1', name: 'Serums', slug: 'serums' },
}

describe('ProductCard', () => {
  it('formats currency with Ks on the right and styles discounted vs original price correctly', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} view="grid" productLink="/products/p1" />
      </MemoryRouter>,
    )

    const currentPrice = screen.getByText('12,000 Ks')
    const originalPrice = screen.getByText('30,000 Ks')

    expect(currentPrice.className).toContain('text-purple-600')
    expect(currentPrice.className).toContain('dark:text-purple-400')
    expect(currentPrice).toHaveClass('font-bold')
    expect(originalPrice).toHaveClass('line-through')
    expect(originalPrice.className).toContain('text-gray-400')
  })

  it('matches the Recommendations badge and action icon styles', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} view="grid" productLink="/products/p1" />
      </MemoryRouter>,
    )

    expect(screen.getByText('SALE')).toHaveClass(
      'rounded-full',
      'bg-gradient-to-r',
      'from-rose-500',
      'to-pink-500',
      'text-white',
    )
    expect(screen.getByRole('button', { name: 'Add to wishlist' })).toHaveClass(
      'rounded-full',
      'bg-white/80',
      'dark:bg-zinc-800/80',
      'shadow-sm',
    )
    expect(screen.getByRole('button', { name: 'Add Glow Serum to cart' })).toHaveClass(
      'rounded-full',
      'bg-violet-600',
      'text-white',
      'shadow-sm',
      'hover:bg-violet-700',
    )
  })

  it('renders SALE, wishlist, and cart controls with Recommendations list styles', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} view="list" productLink="/products/p1" />
      </MemoryRouter>,
    )

    expect(screen.getByText('SALE')).toHaveClass(
      'rounded-full',
      'bg-gradient-to-r',
      'from-rose-500',
      'to-pink-500',
      'text-white',
    )
    expect(screen.getByRole('button', { name: 'Add to wishlist' })).toHaveClass(
      'h-8',
      'w-8',
      'rounded-full',
      'bg-gray-100',
      'hover:bg-gray-200',
      'dark:bg-zinc-800',
      'dark:hover:bg-zinc-700',
    )
    expect(screen.getByRole('button', { name: 'Add Glow Serum to cart' })).toHaveClass(
      'h-8',
      'w-8',
      'rounded-full',
      'bg-violet-600',
      'text-white',
      'shadow-sm',
      'hover:bg-violet-700',
    )
    expect(screen.getByRole('button', { name: 'Add Glow Serum to cart' }).querySelector('svg')).toBeInTheDocument()
  })
})
