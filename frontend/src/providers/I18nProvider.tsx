import '@/i18n'
import type { ReactNode } from 'react'

export function I18nProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
