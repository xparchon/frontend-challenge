import type { PropsWithChildren } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RealtimeUpdatesProvider } from '@/features/realtime/RealtimeUpdatesProvider'
import { queryClient } from '@/lib/query/queryClient'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeUpdatesProvider>{children}</RealtimeUpdatesProvider>
    </QueryClientProvider>
  )
}
