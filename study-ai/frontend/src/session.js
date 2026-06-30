export function getSessionId() {
  let id = localStorage.getItem('study-ai-session')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('study-ai-session', id)
  }
  return id
}

export const API = import.meta.env.VITE_API_URL ?? ''

export function apiFetch(path, options = {}) {
  const sessionId = getSessionId()
  const isFormData = options.body instanceof FormData
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      'X-Session-ID': sessionId,
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers ?? {}),
    },
  })
}
