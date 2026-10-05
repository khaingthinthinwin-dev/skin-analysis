import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TablePagination } from './pagination'

const baseProps = {
  page: 1,
  totalPages: 2,
  limit: 10,
  total: 12,
  itemLabel: 'products',
  onPageChange: vi.fn(),
  onLimitChange: vi.fn(),
}

describe('TablePagination', () => {
  it('labels the page size selector', () => {
    render(<TablePagination {...baseProps} />)
    expect(screen.getByText('Row')).toBeInTheDocument()
    expect(screen.getByLabelText('Rows per page')).toHaveValue('10')
  })

  it('renders the item count with the item label', () => {
    render(<TablePagination {...baseProps} />)
    expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 1-10 of 12 products')
  })

  it('renders a zero range when there are no records', () => {
    render(<TablePagination {...baseProps} page={1} totalPages={1} total={0} itemLabel="reports" />)
    expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 0-0 of 0 reports')
  })

  it('renders prev, page numbers and next controls', () => {
    render(<TablePagination {...baseProps} />)
    expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page')
  })

  it('disables prev on the first page and next on the last page', () => {
    const { rerender } = render(<TablePagination {...baseProps} />)
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()

    const onPageChange = vi.fn()
    rerender(<TablePagination {...baseProps} page={2} onPageChange={onPageChange} />)
    expect(screen.getByRole('button', { name: /prev/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('reports page navigation', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<TablePagination {...baseProps} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(onPageChange).toHaveBeenCalledWith(2)

    await user.click(screen.getByRole('button', { name: '2' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('resets to the first page when the page size changes', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    const onLimitChange = vi.fn()
    render(
      <TablePagination
        {...baseProps}
        page={2}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Rows per page'), '20')
    expect(onLimitChange).toHaveBeenCalledWith(20)
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('collapses long page ranges with an ellipsis', () => {
    render(<TablePagination {...baseProps} page={5} totalPages={10} total={95} />)
    expect(screen.getAllByText('•••').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()
  })
})
