import { useContext } from 'react'
import { RealtimeUpdatesContext } from '@/features/realtime/RealtimeUpdatesContext'

export function useRealtimeUpdates() {
  return useContext(RealtimeUpdatesContext)
}
