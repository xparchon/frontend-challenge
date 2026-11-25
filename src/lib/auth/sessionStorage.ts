import type { Session } from '@/types/session'

const SESSION_STORAGE_KEY = 'kurio.session'

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false

  const session = value as Partial<Session>
  const user = session.user

  return (
    typeof session.accessToken === 'string' &&
    typeof session.expiresAt === 'string' &&
    typeof user === 'object' &&
    user !== null &&
    typeof user.id === 'string' &&
    typeof user.displayName === 'string' &&
    typeof user.username === 'string' &&
    typeof user.email === 'string'
  )
}

export function readStoredSession(): Session | null {
  const rawSession = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!rawSession) return null

  try {
    const parsed: unknown = JSON.parse(rawSession)
    if (isSession(parsed)) return parsed
  } catch (error) {
    console.warn('Stored Kurio session is invalid and will be cleared.', error)
  }

  localStorage.removeItem(SESSION_STORAGE_KEY)
  return null
}

export function storeSession(session: Session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY)
}
