import { describe, it, expect } from 'vitest'
import { updateProfileSchema, PHONE_REGEX } from './profile.schema'

const merchantData = {
  name: 'Merchant User',
  role: 'merchant',
  phone: '+95912345678',
  address: '123 Yangon Street, Yangon',
  avatarUrl: '',
}

const buyerData = {
  name: 'Buyer User',
  role: 'buyer',
  phone: '',
  address: '',
  avatarUrl: '',
}

function issuePaths(data: unknown): (string | number)[] {
  const result = updateProfileSchema.safeParse(data)
  if (result.success) return []
  return result.error.issues.map((issue) => issue.path.join('.'))
}

describe('updateProfileSchema phone & address', () => {
  it('accepts a merchant profile with phone and address', () => {
    expect(updateProfileSchema.safeParse(merchantData).success).toBe(true)
  })

  it('accepts a buyer without phone or address', () => {
    expect(updateProfileSchema.safeParse(buyerData).success).toBe(true)
  })

  it('requires a phone number for a merchant', () => {
    expect(issuePaths({ ...merchantData, phone: '' })).toContain('phone')
  })

  it('requires a non-blank phone number for a merchant', () => {
    expect(issuePaths({ ...merchantData, phone: '   ' })).toContain('phone')
  })

  it('requires an address for a merchant', () => {
    expect(issuePaths({ ...merchantData, address: '' })).toContain('address')
  })

  it('requires a non-blank address for a merchant', () => {
    expect(issuePaths({ ...merchantData, address: '   ' })).toContain('address')
  })

  it('reports every empty field at once for a merchant', () => {
    expect(issuePaths({ ...merchantData, name: '', phone: '', address: '' })).toEqual(
      expect.arrayContaining(['name', 'phone', 'address']),
    )
  })

  it('rejects a malformed phone number for a merchant', () => {
    expect(issuePaths({ ...merchantData, phone: 'not-a-phone' })).toContain(
      'phone',
    )
  })

  it('rejects a phone number longer than 20 characters for a merchant', () => {
    expect(
      issuePaths({ ...merchantData, phone: '+95 9 123 456 789 0000' }),
    ).toContain('phone')
  })

  it('rejects an address longer than 255 characters for a merchant', () => {
    expect(
      issuePaths({ ...merchantData, address: 'a'.repeat(256) }),
    ).toContain('address')
  })

  it('rejects an empty name for any role', () => {
    expect(issuePaths({ ...buyerData, name: '' })).toContain('name')
  })

  it('uses the same phone pattern as registration', () => {
    expect(PHONE_REGEX.test('+95 9 123 456 789')).toBe(true)
    expect(PHONE_REGEX.test('0912345678')).toBe(true)
    expect(PHONE_REGEX.test('abc')).toBe(false)
  })

  it('validates phone and address after trimming surrounding whitespace', () => {
    const result = updateProfileSchema.safeParse({
      ...merchantData,
      phone: '  +95912345678  ',
      address: '  123 Yangon Street, Yangon  ',
    })
    expect(result.success).toBe(true)
  })
})
