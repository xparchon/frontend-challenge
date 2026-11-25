export interface User {
  id: string
  displayName: string
  username: string
  email: string
  avatar?: string
  ensName?: string
}

export interface Session {
  user: User
  accessToken: string
  expiresAt: string
}
