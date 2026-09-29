import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Profile from './Profile'

const { mockUseProfile, mockResubmitLicense } = vi.hoisted(() => ({
  mockUseProfile: vi.fn(),
  mockResubmitLicense: vi.fn(),
}))

vi.mock('@/features/shared/profile/hooks/useProfile', () => ({
  useProfile: mockUseProfile,
}))

vi.mock('@/features/shared/profile/components/ProfileForm', () => ({
  ProfileForm: () => <div>Profile form</div>,
}))

vi.mock('@/features/shared/profile/components/ChangePasswordForm', () => ({
  ChangePasswordForm: () => <div>Change password</div>,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}))

const baseProfile = {
  id: 'merchant-1',
  email: 'merchant@example.com',
  name: 'Merchant',
  role: 'merchant' as const,
  createdAt: new Date().toISOString(),
}

describe('Profile merchant license resubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResubmitLicense.mockResolvedValue(undefined)
    mockUseProfile.mockReturnValue({
      profile: { ...baseProfile, licenseStatus: 'rejected' },
      isLoading: false,
      error: null,
      resubmitLicense: { mutateAsync: mockResubmitLicense },
      isResubmitting: false,
    })
  })

  it('shows Reupload for a rejected merchant', () => {
    render(<Profile />)

    expect(screen.getByRole('button', { name: 'Reupload' })).toBeInTheDocument()
  })

  it('does not show Reupload for a pending merchant', () => {
    mockUseProfile.mockReturnValue({
      profile: { ...baseProfile, licenseStatus: 'pending' },
      isLoading: false,
      error: null,
      resubmitLicense: { mutateAsync: mockResubmitLicense },
      isResubmitting: false,
    })

    render(<Profile />)

    expect(screen.queryByRole('button', { name: 'Reupload' })).not.toBeInTheDocument()
  })
})
