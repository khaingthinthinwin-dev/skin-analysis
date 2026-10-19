import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfileForm } from './ProfileForm'
import type { Profile } from '@/types/profile.types'

const { mockUpdateProfile } = vi.hoisted(() => ({
  mockUpdateProfile: vi.fn(),
}))

vi.mock('../hooks/useProfile', () => ({
  useProfile: () => ({
    updateProfile: { mutateAsync: mockUpdateProfile, isPending: false },
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const merchantProfile: Profile = {
  id: 'merchant-1',
  email: 'merchant@example.com',
  name: 'Merchant',
  role: 'merchant',
  phone: '+95912345678',
  address: '123 Yangon Street, Yangon',
  createdAt: new Date().toISOString(),
}

const buyerProfile: Profile = {
  id: 'buyer-1',
  email: 'buyer@example.com',
  name: 'Buyer',
  role: 'buyer',
  createdAt: new Date().toISOString(),
}

describe('ProfileForm shop contact fields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateProfile.mockResolvedValue({})
  })

  it('shows phone and address fields for a merchant, prefilled', () => {
    render(<ProfileForm profile={merchantProfile} />)

    expect(screen.getByLabelText('Phone Number')).toHaveValue('+95912345678')
    expect(screen.getByLabelText('Shop Address')).toHaveValue(
      '123 Yangon Street, Yangon',
    )
  })

  it('hides phone and address fields for a buyer', () => {
    render(<ProfileForm profile={buyerProfile} />)

    expect(screen.queryByLabelText('Phone Number')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Shop Address')).not.toBeInTheDocument()
  })

  it('saves valid merchant contact details', async () => {
    render(<ProfileForm profile={merchantProfile} />)

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: 'Merchant',
        avatarUrl: '',
        phone: '+95912345678',
        address: '123 Yangon Street, Yangon',
      }),
    )
  })

  it('trims phone and address before saving', async () => {
    render(<ProfileForm profile={merchantProfile} />)

    fireEvent.change(screen.getByLabelText('Phone Number'), {
      target: { value: '  +959 888 777  ' },
    })
    fireEvent.change(screen.getByLabelText('Shop Address'), {
      target: { value: '  456 Mandalay Road  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: 'Merchant',
        avatarUrl: '',
        phone: '+959 888 777',
        address: '456 Mandalay Road',
      }),
    )
  })

  it('blocks saving when a merchant clears phone and address', async () => {
    render(<ProfileForm profile={merchantProfile} />)

    fireEvent.change(screen.getByLabelText('Phone Number'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Shop Address'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(
      await screen.findByText('Phone number is required for merchant accounts'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Shop address is required for merchant accounts'),
    ).toBeInTheDocument()
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })

  it('blocks saving when a merchant clears only the name', async () => {
    render(<ProfileForm profile={merchantProfile} />)

    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(
      await screen.findByText('Name must be at least 2 characters'),
    ).toBeInTheDocument()
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })

  it('blocks saving when a merchant enters an invalid phone number', async () => {
    render(<ProfileForm profile={merchantProfile} />)

    fireEvent.change(screen.getByLabelText('Phone Number'), {
      target: { value: 'not-a-phone' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(
      await screen.findByText('Please enter a valid phone number'),
    ).toBeInTheDocument()
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })

  it('blocks saving when a merchant enters an address over 255 characters', async () => {
    render(<ProfileForm profile={merchantProfile} />)

    fireEvent.change(screen.getByLabelText('Shop Address'), {
      target: { value: 'a'.repeat(256) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(
      await screen.findByText('Address must not exceed 255 characters'),
    ).toBeInTheDocument()
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })
})
