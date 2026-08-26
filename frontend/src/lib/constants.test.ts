import { describe, it, expect } from 'vitest'
import { APP_NAME, API_BASE_URL, TOKEN_KEYS, ROUTES, SUPPORTED_LANGUAGES, THEME_OPTIONS } from './constants'

describe('Constants', () => {
  it('has correct APP_NAME', () => {
    expect(APP_NAME).toBe('Cosmetics Finder')
  })

  it('has correct API_BASE_URL', () => {
    expect(API_BASE_URL).toBe('http://localhost:8080/api/v1')
  })

  it('has correct TOKEN_KEYS', () => {
    expect(TOKEN_KEYS.ACCESS).toBe('accessToken')
    expect(TOKEN_KEYS.REFRESH).toBe('refreshToken')
  })

  it('has all required routes', () => {
    expect(ROUTES.HOME).toBe('/')
    expect(ROUTES.LOGIN).toBe('/login')
    expect(ROUTES.REGISTER).toBe('/register')
    expect(ROUTES.UNAUTHORIZED).toBe('/unauthorized')
    expect(ROUTES.DASHBOARD).toBe('/dashboard')
    expect(ROUTES.PROFILE).toBe('/dashboard/profile')
    expect(ROUTES.SETTINGS).toBe('/dashboard/settings')
  })

  it('has supported languages', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(3)
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toContain('en')
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toContain('my')
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toContain('ja')
  })

  it('has theme options', () => {
    expect(THEME_OPTIONS).toEqual(['light', 'dark', 'system'])
  })
})
