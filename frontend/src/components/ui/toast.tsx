import { toast as sonnerToast } from 'sonner'

type ToastOptions = {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function toast(options: ToastOptions) {
  if (options.variant === 'destructive') {
    sonnerToast.error(options.title, { description: options.description })
  } else {
    sonnerToast.success(options.title, { description: options.description })
  }
}

export { sonnerToast as toastInstance }
