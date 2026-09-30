import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MeshOverlayViewer } from './MeshOverlayViewer'
import { initTestI18n } from '@/test/i18nTest'
import { getImageUrl } from '@/lib/image-url'

beforeAll(async () => {
  await initTestI18n()
})

const baseProps = {
  scanImageUrl: '/scan.png',
  meshOverlayUrl: '/mesh.png',
}

describe('MeshOverlayViewer', () => {
  it('renders title, scan image and hide-mesh button while mesh is visible', () => {
    render(
      <MeshOverlayViewer {...baseProps} showMesh onToggleMesh={vi.fn()} />,
    )

    expect(screen.getByText('Facial Mesh Overlay')).toBeInTheDocument()
    expect(screen.getByAltText('Facial scan image')).toHaveAttribute(
      'src',
      getImageUrl('/scan.png'),
    )
    expect(screen.getByRole('button', { name: /Hide Mesh/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Show Mesh/ })).not.toBeInTheDocument()
  })

  it('toggles to the show-mesh label when mesh is hidden', () => {
    render(
      <MeshOverlayViewer {...baseProps} showMesh={false} onToggleMesh={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: /Show Mesh/ })).toBeInTheDocument()
  })

  it('calls onToggleMesh when the toggle button is pressed', () => {
    const onToggleMesh = vi.fn()
    render(
      <MeshOverlayViewer {...baseProps} showMesh onToggleMesh={onToggleMesh} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Hide Mesh/ }))
    expect(onToggleMesh).toHaveBeenCalledTimes(1)
  })

  it('hides the download button when no handler is provided', () => {
    const { rerender } = render(
      <MeshOverlayViewer {...baseProps} showMesh onToggleMesh={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument()

    rerender(
      <MeshOverlayViewer
        {...baseProps}
        showMesh
        onToggleMesh={vi.fn()}
        onDownload={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /Download/ })).toBeInTheDocument()
  })
})
