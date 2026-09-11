import { describe, expect, it } from 'vitest'
import { normalizeProductUpdatePayload } from './product.service'

describe('normalizeProductUpdatePayload', () => {
  it('preserves a false isActive value in edit updates', () => {
    const payload = normalizeProductUpdatePayload({
      name: 'Updated serum',
      isActive: false,
    })

    expect(payload.isActive).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(payload, 'isActive')).toBe(true)
  })
})
