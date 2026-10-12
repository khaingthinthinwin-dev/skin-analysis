import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { searchParamsSchema } from '@/schemas/search.schema'
import { FilterPanel } from './FilterPanel'

describe('FilterPanel price range validation', () => {
  it('shows negative-price errors only after blur and commits after correction', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    const onPriceErrorChange = vi.fn()

    render(
      <FilterPanel
        params={searchParamsSchema.parse({})}
        onUpdate={onUpdate}
        onPriceErrorChange={onPriceErrorChange}
        categories={[]}
      />,
    )

    const minInput = screen.getByPlaceholderText('Min')
    await user.click(minInput)
    fireEvent.change(minInput, { target: { value: '-1' } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onUpdate).not.toHaveBeenCalled()

    fireEvent.blur(minInput)

    expect(screen.getByRole('alert')).toHaveTextContent('Price cannot be negative.')
    expect(onUpdate).not.toHaveBeenCalled()
    expect(onPriceErrorChange).toHaveBeenLastCalledWith(true)

    await user.click(minInput)
    fireEvent.change(minInput, { target: { value: '0' } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    fireEvent.blur(minInput)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onUpdate).toHaveBeenCalledWith({ minPrice: 0, maxPrice: undefined })
    expect(onPriceErrorChange).toHaveBeenLastCalledWith(false)
  })

  it('rejects a minimum greater than the maximum on blur', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()

    const { rerender } = render(
      <FilterPanel
        params={searchParamsSchema.parse({})}
        onUpdate={onUpdate}
        categories={[]}
      />,
    )

    const minInput = screen.getByPlaceholderText('Min')

    await user.click(minInput)
    fireEvent.change(minInput, { target: { value: '100' } })
    await user.tab()
    expect(onUpdate).toHaveBeenCalledWith({ minPrice: 100, maxPrice: undefined })
    onUpdate.mockClear()

    rerender(
      <FilterPanel
        params={searchParamsSchema.parse({ minPrice: 100 })}
        onUpdate={onUpdate}
        categories={[]}
      />,
    )

    const updatedMaxInput = screen.getByPlaceholderText('Max')
    await user.click(updatedMaxInput)
    fireEvent.change(updatedMaxInput, { target: { value: '50' } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.tab()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Minimum price cannot be greater than maximum price.',
    )
    expect(onUpdate).not.toHaveBeenCalled()
  })
})
