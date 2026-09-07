import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMerchantProductsGuard } from './merchantProducts.guard'
import * as authHook from '@/hooks/useAuth'

describe('useMerchantProductsGuard', () => {
  it('handles loading state', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    })

    const { result } = renderHook(() => useMerchantProductsGuard())
    expect(result.current.isLoading).toBe(true)
    expect(result.current.showCrudActions).toBe(false)
    expect(result.current.showPendingBanner).toBe(false)
  })

  it('handles pending license status with banner and restricted actions', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: {
        id: 'user-1',
        email: 'merchant@test.com',
        name: 'Test Merchant',
        role: 'merchant',
        licenseStatus: 'pending',
        createdAt: '2026-01-01',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    })

    const { result } = renderHook(() => useMerchantProductsGuard())
    expect(result.current.isPending).toBe(true)
    expect(result.current.isApproved).toBe(false)
    expect(result.current.showPendingBanner).toBe(true)
    expect(result.current.showCrudActions).toBe(false)
    expect(result.current.showRejectionBanner).toBe(false)
  })

  it('handles approved license status with full actions and no pending banner', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: {
        id: 'user-1',
        email: 'merchant@test.com',
        name: 'Test Merchant',
        role: 'merchant',
        licenseStatus: 'approved',
        createdAt: '2026-01-01',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    })

    const { result } = renderHook(() => useMerchantProductsGuard())
    expect(result.current.isApproved).toBe(true)
    expect(result.current.isPending).toBe(false)
    expect(result.current.showPendingBanner).toBe(false)
    expect(result.current.showCrudActions).toBe(true)
    expect(result.current.showRejectionBanner).toBe(false)
  })

  it('handles rejected license status with rejection banner and restricted actions', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: {
        id: 'user-1',
        email: 'merchant@test.com',
        name: 'Test Merchant',
        role: 'merchant',
        licenseStatus: 'rejected',
        createdAt: '2026-01-01',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    })

    const { result } = renderHook(() => useMerchantProductsGuard())
    expect(result.current.isRejected).toBe(true)
    expect(result.current.isApproved).toBe(false)
    expect(result.current.showPendingBanner).toBe(false)
    expect(result.current.showRejectionBanner).toBe(true)
    expect(result.current.showCrudActions).toBe(false)
  })
})
