import { API_BASE_URL } from './constants'

export function getImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const base = API_BASE_URL.replace(/\/api\/v1\/?$/, '')
  return base + url
}