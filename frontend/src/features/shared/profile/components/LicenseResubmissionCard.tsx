import { useRef } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface LicenseResubmissionButtonProps {
  onUpload: (file: File) => Promise<unknown>
  isPending: boolean
}

export function LicenseResubmissionButton({
  onUpload,
  isPending,
}: LicenseResubmissionButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted')
      return
    }
    if (file.name.toLowerCase() !== 'license.pdf') {
      toast.error('File must be named license.pdf')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be no larger than 10MB')
      return
    }

    try {
      await onUpload(file)
      toast.success('Business license uploaded and sent for review')
    } catch {
      toast.error('Failed to upload the business license')
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isPending}
        className="h-7 w-20 self-center gap-1 px-1.5 text-[10px]"
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Upload className="h-3 w-3" />
        )}
        Reupload
      </Button>
    </>
  )
}
