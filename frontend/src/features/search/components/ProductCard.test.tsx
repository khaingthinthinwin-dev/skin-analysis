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
})
