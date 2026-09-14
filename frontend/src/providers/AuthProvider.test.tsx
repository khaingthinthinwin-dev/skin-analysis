import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth, AuthProvider } from './AuthProvider'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// Mock authService
vi.mock('@/services/auth.service', () => ({
  authService: {
    verifyToken: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
  },
}))

// Mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    clear: vi.fn(),
  }),
}))

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { href: '/', pathname: '/' },
  writable: true,
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('provides auth context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current).toHaveProperty('user')
    expect(result.current).toHaveProperty('isAuthenticated')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('login')
    expect(result.current).toHaveProperty('register')
    expect(result.current).toHaveProperty('logout')
    expect(result.current).toHaveProperty('refreshUser')
  })

  it('starts with no user and not authenticated', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('throws error when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')
    consoleSpy.mockRestore()
  })

  it('logout clears user and tokens', async () => {
    localStorage.setItem('accessToken', 'test-token')
    localStorage.setItem('refreshToken', 'test-refresh')

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })
})
