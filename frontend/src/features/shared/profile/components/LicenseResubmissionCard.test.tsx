import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LicenseResubmissionButton } from './LicenseResubmissionCard'

describe('LicenseResubmissionButton', () => {
  it('uploads a new PDF license', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined)
    render(<LicenseResubmissionButton onUpload={onUpload} isPending={false} />)

    const file = new File(['pdf'], 'license.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    expect(screen.getByRole('button', { name: 'Reupload' })).toBeInTheDocument()
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file))
  })

  it('rejects a non-PDF file before uploading', () => {
    const onUpload = vi.fn()
    render(<LicenseResubmissionButton onUpload={onUpload} isPending={false} />)

    const file = new File(['image'], 'license.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    expect(onUpload).not.toHaveBeenCalled()
  })
})
