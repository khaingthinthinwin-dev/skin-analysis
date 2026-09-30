interface ApiErrorShape {
  response?: { data?: { message?: string | string[] } };
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as ApiErrorShape)?.response?.data?.message;
  if (Array.isArray(message)) {
    return message[0] ?? fallback;
  }
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }
  return fallback;
}
