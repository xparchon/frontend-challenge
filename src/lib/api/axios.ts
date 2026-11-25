import axios from 'axios'
import { readStoredSession } from '@/lib/auth/sessionStorage'

const baseURL = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

api.interceptors.request.use((config) => {
  const session = readStoredSession()
  if (session) config.headers.Authorization = `Bearer ${session.accessToken}`

  return config
})
