import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCurrentSession, login, logout, register } from '@/lib/api/auth'
import { readStoredSession } from '@/lib/auth/sessionStorage'
import type { Session } from '@/types/session'

const sessionQueryKey = ['auth', 'session'] as const

export function useAuth() {
  const queryClient = useQueryClient()
  const sessionQuery = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getCurrentSession,
    enabled: readStoredSession() !== null,
    retry: false,
    staleTime: 30_000,
  })

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      queryClient.setQueryData<Session | null>(sessionQueryKey, session)
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (session) => {
      queryClient.setQueryData<Session | null>(sessionQueryKey, session)
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData<Session | null>(sessionQueryKey, null)
      queryClient.removeQueries({ queryKey: ['private'] })
      queryClient.removeQueries({ queryKey: ['cart'] })
    },
  })

  return {
    session: sessionQuery.data ?? null,
    isSessionLoading: sessionQuery.isLoading,
    isAuthenticating: loginMutation.isPending || registerMutation.isPending,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
  }
}
