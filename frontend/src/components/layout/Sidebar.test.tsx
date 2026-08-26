import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, it, expect, vi } from 'vitest'
import { Sidebar } from './Sidebar'
import type { UserRole } from '@/lib/navConfig'

// Mock useAuth
const mockLogout = vi.fn()
let mockUser: { id: string; name: string; email: string; role: UserRole } | null = {
  id: '1',
  name: 'Test Buyer',
  email: 'buyer@example.com',
  role: 'buyer',
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}))

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}))

describe('Sidebar Component', () => {
  it('renders Buyer role navigation and sections correctly', () => {
    mockUser = { id: '1', name: 'Beauty Fan', email: 'buyer@test.com', role: 'buyer' }

    render(
      <MemoryRouter initialEntries={['/buyer']}>
        <Sidebar isOpen={true} onClose={() => {}} role="buyer" />
      </MemoryRouter>
    )

    expect(screen.getByText('Cosmetics Finder')).toBeInTheDocument()
    expect(screen.getByText('Beauty Portal')).toBeInTheDocument()
    expect(screen.getByText('Buyer')).toBeInTheDocument()
    expect(screen.getByText(/explore/i)).toBeInTheDocument()
    expect(screen.getByText(/ai intelligence/i)).toBeInTheDocument()
    expect(screen.getByText('Skin Analysis')).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument() // Pink AI badge
    expect(screen.getByText('Beauty Fan')).toBeInTheDocument()
  })

  it('renders Merchant role navigation correctly', () => {
    mockUser = { id: '2', name: 'Seller Store', email: 'merchant@test.com', role: 'merchant' }

    render(
      <MemoryRouter initialEntries={['/merchant']}>
        <Sidebar isOpen={true} onClose={() => {}} role="merchant" />
      </MemoryRouter>
    )

    expect(screen.getByText('Merchant Hub')).toBeInTheDocument()
    expect(screen.getByText('Merchant')).toBeInTheDocument()
    expect(screen.getByText(/catalog & sales/i)).toBeInTheDocument()
    expect(screen.getByText('Products')).toBeInTheDocument()
    expect(screen.getByText('Promotions')).toBeInTheDocument()
    expect(screen.getByText('Seller Store')).toBeInTheDocument()
  })

  it('renders Admin role navigation correctly', () => {
    mockUser = { id: '3', name: 'Super Admin', email: 'admin@test.com', role: 'admin' }

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Sidebar isOpen={true} onClose={() => {}} role="admin" />
      </MemoryRouter>
    )

    expect(screen.getByText('Admin Console')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText(/finance & governance/i)).toBeInTheDocument()
    expect(screen.getByText('Audit Logs')).toBeInTheDocument()
    expect(screen.getByText('Super Admin')).toBeInTheDocument()
  })

  it('calls logout callback when logout button is clicked', () => {
    const handleLogout = vi.fn()
    render(
      <MemoryRouter initialEntries={['/buyer']}>
        <Sidebar isOpen={true} onClose={() => {}} role="buyer" onLogout={handleLogout} />
      </MemoryRouter>
    )

    const logoutBtn = screen.getByRole('button', { name: /log out/i })
    fireEvent.click(logoutBtn)

    expect(handleLogout).toHaveBeenCalledTimes(1)
  })

  it('toggles collapse mode when collapse button is clicked', () => {
    const handleToggle = vi.fn()
    render(
      <MemoryRouter initialEntries={['/buyer']}>
        <Sidebar
          isOpen={true}
          onClose={() => {}}
          role="buyer"
          isCollapsed={false}
          onToggleCollapse={handleToggle}
        />
      </MemoryRouter>
    )

    const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i })
    fireEvent.click(collapseBtn)

    expect(handleToggle).toHaveBeenCalledTimes(1)
  })
})
