import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageUploadZone } from './ImageUploadZone'
import { initTestI18n } from '@/test/i18nTest'

beforeAll(async () => {
  await initTestI18n()
  if (typeof URL.createObjectURL !== 'function') {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview') })
  }
})

const makeFile = (name: string, type: string) => new File(['dummy'], name, { type })

const dropFile = (container: HTMLElement, file: File) => {
  const zone = container.querySelector('.border-dashed') as HTMLElement
  fireEvent.drop(zone, { dataTransfer: { files: [file], types: ['Files'] } })
}

describe('ImageUploadZone', () => {
  it('previews a valid JPG and keeps the upload button disabled until consent', async () => {
    const onUpload = vi.fn().mockResolvedValue({})
    const user = userEvent.setup()
    const { container } = render(<ImageUploadZone onUpload={onUpload} />)

    expect(screen.queryByAltText('Uploaded facial image preview')).not.toBeInTheDocument()

    dropFile(container, makeFile('face.jpg', 'image/jpeg'))

    const preview = await screen.findByAltText('Uploaded facial image preview')
    expect(preview).toBeInTheDocument()

    const uploadButton = screen.getByRole('button', { name: 'Upload File' })
    expect(uploadButton).toBeDisabled()

    await user.click(screen.getByLabelText('I consent to AI facial analysis processing'))
    expect(uploadButton).toBeEnabled()
    expect(onUpload).not.toHaveBeenCalled()
  })

  it('rejects unsupported file types with an inline error', () => {
    const onUpload = vi.fn().mockResolvedValue({})
    const onError = vi.fn()
    const { container } = render(<ImageUploadZone onUpload={onUpload} onError={onError} />)

    dropFile(container, makeFile('report.pdf', 'application/pdf'))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unsupported file format. Please use JPG, PNG, WebP.',
    )
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: '40001' }),
    )
    expect(onUpload).not.toHaveBeenCalled()
  })

  it('rejects files larger than 10MB', () => {
    const onUpload = vi.fn().mockResolvedValue({})
    const { container } = render(<ImageUploadZone onUpload={onUpload} />)

    const bigFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'huge.jpg', {
      type: 'image/jpeg',
    })
    dropFile(container, bigFile)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'File is too large. Maximum size is 10MB.',
    )
    expect(onUpload).not.toHaveBeenCalled()
  })
})
