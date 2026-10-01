type ErrorEnvelope = {
  message?: unknown
  data?: { message?: unknown }
}

/**
 * Extracts a human readable message from an API error.
 *
 * The backend exception filter returns `{ statusCode, errorCode, message, ... }`
 * at the top level, while success payloads are wrapped in `{ data }` — both
 * shapes are checked so callers never surface the raw axios message.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { data?: unknown } })?.response
  const body = response?.data as ErrorEnvelope | undefined
  const raw = body?.message ?? (body?.data as { message?: unknown } | undefined)?.message

  if (Array.isArray(raw)) {
    const joined = raw.filter((item): item is string => typeof item === 'string' && !!item.trim())
    if (joined.length > 0) return joined.join(', ')
  } else if (typeof raw === 'string' && raw.trim()) {
    return raw
  }

  if (err instanceof Error && err.message) return err.message
  return fallback
}
