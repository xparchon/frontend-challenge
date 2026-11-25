import { http, HttpResponse } from 'msw'
import { clearStoredSession, readStoredSession, storeSession } from '@/lib/auth/sessionStorage'
import type { RegisterCredentials } from '@/lib/api/auth'
import type { User, Session } from '@/types/session'

interface MockUserRecord {
  user: User
  passwordHash: string
}

const usersStorageKey = 'kurio.mock.auth.users'
const sessionsStorageKey = 'kurio.mock.auth.sessions'
const mockSessionDurationMs = 30 * 24 * 60 * 60 * 1000
const seedCredentials = [
  {
    id: 'user-1',
    displayName: 'Nova Reserva',
    username: 'nova.kurio',
    email: 'nova@kurio.test',
    ensName: 'nova.kurio.eth',
    password: 'NovaKurio!23',
  },
  {
    id: 'user-2',
    displayName: 'Artista Kurio',
    username: 'artista.kurio',
    email: 'artista@kurio.test',
    ensName: 'artista.kurio.eth',
    password: 'ArtistaKurio!23',
  },
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isUserRecord(value: unknown): value is MockUserRecord {
  if (!isRecord(value) || !isRecord(value.user)) return false

  return (
    typeof value.passwordHash === 'string' &&
    typeof value.user.id === 'string' &&
    typeof value.user.displayName === 'string' &&
    typeof value.user.username === 'string' &&
    typeof value.user.email === 'string'
  )
}

async function hashPassword(password: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function seedUsers(): Promise<MockUserRecord[]> {
  return Promise.all(seedCredentials.map(async ({ password, ...user }) => ({
    user,
    passwordHash: await hashPassword(password),
  })))
}

async function loadUsers() {
  const savedUsers = localStorage.getItem(usersStorageKey)
  if (savedUsers) {
    try {
      const parsed: unknown = JSON.parse(savedUsers)
      if (Array.isArray(parsed) && parsed.every(isUserRecord)) return parsed
    } catch (error) {
      console.warn('Mock account data is invalid and will be reseeded.', error)
    }
    console.warn('Mock account data has an invalid shape and will be reseeded.')
  }

  const users = await seedUsers()
  saveUsers(users)
  return users
}

function saveUsers(users: MockUserRecord[]) {
  localStorage.setItem(usersStorageKey, JSON.stringify(users))
}

function loadSessionTokens() {
  const savedTokens = localStorage.getItem(sessionsStorageKey)
  if (!savedTokens) return [] as string[]

  try {
    const parsed: unknown = JSON.parse(savedTokens)
    if (Array.isArray(parsed) && parsed.every((token) => typeof token === 'string')) return parsed
  } catch (error) {
    console.warn('Mock session data is invalid and will be cleared.', error)
  }

  localStorage.removeItem(sessionsStorageKey)
  return [] as string[]
}

function saveSessionTokens(tokens: string[]) {
  localStorage.setItem(sessionsStorageKey, JSON.stringify(tokens))
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('Authorization')
  return authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
}

export function getAuthorizedUser(request: Request): User | null {
  const token = getBearerToken(request)
  const session = readStoredSession()
  if (!token || !session || session.accessToken !== token || !loadSessionTokens().includes(token)) return null

  if (Date.parse(session.expiresAt) <= Date.now()) {
    saveSessionTokens(loadSessionTokens().filter((savedToken) => savedToken !== token))
    clearStoredSession()
    return null
  }

  return session.user
}

export async function persistMockUser(user: User) {
  const users = await loadUsers()
  saveUsers(users.map((record) => record.user.id === user.id ? { ...record, user } : record))
}

export async function hasMockIdentityConflict(userId: string, email: string, username: string) {
  const users = await loadUsers()
  return users.some(({ user }) =>
    user.id !== userId &&
    (user.email.toLowerCase() === email.toLowerCase() || user.username.toLowerCase() === username.toLowerCase()),
  )
}

export async function changeMockPassword(userId: string, currentPassword: string, newPassword: string) {
  const users = await loadUsers()
  const record = users.find(({ user }) => user.id === userId)
  if (!record || record.passwordHash !== await hashPassword(currentPassword)) return false

  const passwordHash = await hashPassword(newPassword)
  saveUsers(users.map((item) => item.user.id === userId
    ? { ...item, passwordHash }
    : item))
  return true
}

function unauthorized(message = 'Sua sessão é inválida ou expirou.') {
  return HttpResponse.json(
    { code: 'UNAUTHORIZED', message },
    { status: 401 },
  )
}

async function createSession(user: User): Promise<Session> {
  const accessToken = `mock.${user.id}.${crypto.randomUUID()}`
  saveSessionTokens([...loadSessionTokens(), accessToken])
  return {
    user,
    accessToken,
    expiresAt: new Date(Date.now() + mockSessionDurationMs).toISOString(),
  }
}

export const authHandlers = [
  http.post('/api/auth/register', async ({ request }) => {
    const body: unknown = await request.json()
    const payload = isRecord(body) ? body : {}
    const username = typeof payload.username === 'string' ? payload.username.trim() : ''
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
    const password = typeof payload.password === 'string' ? payload.password : ''
    const fieldErrors: Record<string, string[]> = {}

    if (username.length < 3) fieldErrors.username = ['Use ao menos 3 caracteres no nome de usuário.']
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = ['Informe um e-mail válido.']
    if (password.length < 8) fieldErrors.password = ['A senha deve ter ao menos 8 caracteres.']

    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Revise os campos destacados.', fieldErrors },
        { status: 422 },
      )
    }

    const users = await loadUsers()
    if (users.some(({ user }) => user.email === email || user.username.toLowerCase() === username.toLowerCase())) {
      return HttpResponse.json(
        {
          code: 'CONFLICT',
          message: 'Já existe uma conta com este e-mail ou nome de usuário.',
          fieldErrors: { email: ['E-mail ou nome de usuário já cadastrado.'] },
        },
        { status: 409 },
      )
    }

    const credentials: RegisterCredentials = { username, email, password }
    const user: User = {
      id: `user-${crypto.randomUUID()}`,
      displayName: credentials.username,
      username: credentials.username,
      email: credentials.email,
    }
    const updatedUsers = [...users, { user, passwordHash: await hashPassword(credentials.password) }]
    saveUsers(updatedUsers)

    return HttpResponse.json(await createSession(user), { status: 201 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body: unknown = await request.json()
    const payload = isRecord(body) ? body : {}
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
    const password = typeof payload.password === 'string' ? payload.password : ''

    if (!email || !password) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Informe seu e-mail e sua senha.',
          fieldErrors: {
            ...(!email ? { email: ['Informe seu e-mail.'] } : {}),
            ...(!password ? { password: ['Informe sua senha.'] } : {}),
          },
        },
        { status: 422 },
      )
    }

    const users = await loadUsers()
    const passwordHash = await hashPassword(password)
    const record = users.find(({ user, passwordHash: savedHash }) => user.email === email && savedHash === passwordHash)
    if (!record) return unauthorized('E-mail ou senha incorretos.')

    return HttpResponse.json(await createSession(record.user))
  }),

  http.get('/api/session', ({ request }) => {
    const token = getBearerToken(request)
    const session = readStoredSession()
    if (!token || !session || session.accessToken !== token || !loadSessionTokens().includes(token)) {
      return unauthorized()
    }

    if (Date.parse(session.expiresAt) <= Date.now()) {
      saveSessionTokens(loadSessionTokens().filter((savedToken) => savedToken !== token))
      clearStoredSession()
      return HttpResponse.json(
        { code: 'SESSION_EXPIRED', message: 'Sua sessão expirou. Entre novamente.' },
        { status: 401 },
      )
    }

    const renewedSession = { ...session, expiresAt: new Date(Date.now() + mockSessionDurationMs).toISOString() }
    storeSession(renewedSession)
    return HttpResponse.json(renewedSession)
  }),

  http.post('/api/auth/logout', ({ request }) => {
    const token = getBearerToken(request)
    if (token) saveSessionTokens(loadSessionTokens().filter((savedToken) => savedToken !== token))
    return new HttpResponse(null, { status: 204 })
  }),
]
