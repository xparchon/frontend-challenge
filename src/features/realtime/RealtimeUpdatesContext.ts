import { createContext } from 'react'
import type { NftUpdatedEvent } from '@/types/realtime'

export type ConnectionStatus = 'disabled' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export interface RealtimeContextValue {
  connectionStatus: ConnectionStatus
  nftUpdates: Record<string, NftUpdatedEvent>
}

export const RealtimeUpdatesContext = createContext<RealtimeContextValue>({
  connectionStatus: 'disabled',
  nftUpdates: {},
})
