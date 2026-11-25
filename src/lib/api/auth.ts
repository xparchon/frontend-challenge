import axios from 'axios'
import { api } from '@/lib/api/axios'
import { clearStoredSession, readStoredSession, storeSession } from '@/lib/auth/sessionStorage'
import type { Session } from '@/types/session'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends LoginCredentials {
  username: string
}

export async function login(credentials: LoginCredentials) {
  const { data } = await api.post<Session>('/auth/login', credentials)
  storeSession(data)
  return data
}

export async function register(credentials: RegisterCredentials) {
  const { data } = await api.post<Session>('/auth/register', credentials)
  storeSession(data)
  return data
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!readStoredSession()) return null

  try {
    const { data } = await api.get<Session>('/session')
    return data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearStoredSession()
      return null
    }

    throw error
  }
}

export async function logout() {
  if (!readStoredSession()) return

  await api.post('/auth/logout')
  clearStoredSession()
}
