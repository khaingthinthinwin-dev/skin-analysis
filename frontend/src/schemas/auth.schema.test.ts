import { describe, it, expect } from 'vitest'
import { registerSchema } from './auth.schema'

const buyerData = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'Password1!',
  confirmPassword: 'Password1!',
  role: 'buyer' as const,
  address: '',
  phone: '',
  licenseFile: null,
  agreeToTerms: true,
}

const merchantData = {
  ...buyerData,
  role: 'merchant' as const,
  address: '123 Yangon Street, Yangon',
  phone: '+95912345678',
  licenseFile: new File(['x'], 'license.pdf', { type: 'application/pdf' }),
}

function issuePaths(data: unknown): (string | number)[] {
  const result = registerSchema.safeParse(data)
  if (result.success) return []
  return result.error.issues.map((issue) => issue.path.join('.'))
}

describe('registerSchema address & phone', () => {
  it('accepts a buyer without address or phone', () => {
    expect(registerSchema.safeParse(buyerData).success).toBe(true)
  })

  it('accepts a merchant with address and phone', () => {
    expect(registerSchema.safeParse(merchantData).success).toBe(true)
  })

  it('requires an address for merchant registration', () => {
    expect(issuePaths({ ...merchantData, address: '   ' })).toContain('address')
  })

  it('requires a phone number for merchant registration', () => {
    expect(issuePaths({ ...merchantData, phone: '' })).toContain('phone')
  })

  it('rejects a malformed phone number for merchant registration', () => {
    expect(issuePaths({ ...merchantData, phone: 'not-a-phone' })).toContain(
      'phone',
    )
  })

  it('rejects an address longer than 255 characters', () => {
    expect(issuePaths({ ...merchantData, address: 'a'.repeat(256) })).toContain(
      'address',
    )
  })
})
