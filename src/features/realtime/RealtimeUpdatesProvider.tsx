import { useEffect, useState, type PropsWithChildren } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { RealtimeUpdatesContext, type ConnectionStatus } from '@/features/realtime/RealtimeUpdatesContext'
import type { PaginatedResponse } from '@/types/api'
import type { Nft } from '@/types/nft'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/types/realtime'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNftUpdatedEvent(value: unknown): value is NftUpdatedEvent {
  if (!isRecord(value) || !isRecord(value.nft) || !isRecord(value.previous)) return false
  return (
    typeof value.eventId === 'string' &&
    typeof value.resourceId === 'string' &&
    typeof value.version === 'number' &&
    Number.isInteger(value.version) &&
    typeof value.updatedAt === 'string' &&
    typeof value.nft.id === 'string' &&
    value.resourceId === `nft:${value.nft.id}` &&
    value.version === value.nft.version &&
    typeof value.nft.price === 'string' &&
    typeof value.nft.editionsAvailable === 'number' &&
    typeof value.previous.price === 'string' &&
    typeof value.previous.editionsAvailable === 'number'
  )
}

function isOrderUpdatedEvent(value: unknown): value is OrderUpdatedEvent {
  if (!isRecord(value) || !isRecord(value.order)) return false
  return (
    typeof value.eventId === 'string' &&
    typeof value.resourceId === 'string' &&
    typeof value.userId === 'string' &&
    typeof value.version === 'number' &&
    Number.isInteger(value.version) &&
    typeof value.updatedAt === 'string' &&
    typeof value.order.id === 'string' &&
    value.resourceId === `order:${value.order.id}` &&
    value.userId === value.order.userId &&
    value.version === value.order.version
  )
}

export function RealtimeUpdatesProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [nftUpdatesByOwner, setNftUpdatesByOwner] = useState<Record<string, Record<string, NftUpdatedEvent>>>({})
  const userId = session?.user.id ?? null
  const accessToken = session?.accessToken ?? null
  const notificationsOwner = userId ?? 'guest'
  const isEnabled = import.meta.env.DEV || import.meta.env.VITE_MOCK_API === 'true'
  const nftUpdates = nftUpdatesByOwner[notificationsOwner] ?? {}

  useEffect(() => {
    if (!isEnabled) return

    let disposed = false
    let cleanupSocket: (() => void) | undefined
    const connect = async () => {
      try {
        const { io } = await import('socket.io-client')
        if (disposed) return

        setConnectionStatus('connecting')
        const socket = io(import.meta.env.VITE_SOCKET_URL?.trim() || window.location.origin, {
          path: '/socket.io',
          addTrailingSlash: false,
          transports: ['websocket'],
          autoConnect: false,
        })
        const eventVersions = new Map<string, number>()

        const reconcileActiveQueries = () => {
          void queryClient.invalidateQueries({ queryKey: ['nfts'] })
          void queryClient.invalidateQueries({ queryKey: ['nft'] })
          void queryClient.invalidateQueries({ queryKey: ['cart'] })
          if (userId) {
            void queryClient.invalidateQueries({ queryKey: ['private', userId, 'orders'] })
          }
        }

        const handleConnect = () => {
          setConnectionStatus('reconnecting')
          socket.emit('session.subscribe', { accessToken })
        }
        const handleSessionReady = () => {
          setConnectionStatus('connected')
          reconcileActiveQueries()
        }
        const handleDisconnect = () => setConnectionStatus('reconnecting')
        const handleConnectError = () => setConnectionStatus('disconnected')
        const handleReconnectAttempt = () => setConnectionStatus('reconnecting')

        const handleNftUpdated = (payload: unknown) => {
          if (!isNftUpdatedEvent(payload)) {
            console.warn('Ignoring a malformed nft.updated event.')
            return
          }

          const { nft } = payload
          const cachedNft = queryClient.getQueryData<Nft>(['nft', nft.id])
          const catalogVersions = queryClient
            .getQueriesData<PaginatedResponse<Nft>>({ queryKey: ['nfts'] })
            .map(([, catalog]) => catalog?.items.find((item) => item.id === nft.id)?.version ?? 0)
          const knownVersion = Math.max(
            eventVersions.get(`nft:${nft.id}`) ?? 0,
            cachedNft?.version ?? 0,
            ...catalogVersions,
          )
          if (payload.version <= knownVersion) return

          eventVersions.set(`nft:${nft.id}`, payload.version)
          queryClient.setQueryData<Nft>(['nft', nft.id], (current) =>
            !current || current.version < payload.version ? nft : current,
          )
          queryClient.setQueriesData<PaginatedResponse<Nft>>({ queryKey: ['nfts'] }, (catalog) => {
            if (!catalog) return catalog
            return {
              ...catalog,
              items: catalog.items.map((item) =>
                item.id === nft.id && item.version < payload.version ? nft : item,
              ),
            }
          })
          setNftUpdatesByOwner((current) => ({
            ...current,
            [notificationsOwner]: {
              ...(current[notificationsOwner] ?? {}),
              [nft.id]: payload,
            },
          }))
          void queryClient.invalidateQueries({ queryKey: ['nfts'] })
          void queryClient.invalidateQueries({ queryKey: ['nft', nft.id] })
          void queryClient.invalidateQueries({ queryKey: ['cart'] })
        }

        const handleOrderUpdated = (payload: unknown) => {
          if (!isOrderUpdatedEvent(payload)) {
            console.warn('Ignoring a malformed order.updated event.')
            return
          }
          if (!userId || payload.userId !== userId) return

          const orderKey = ['private', userId, 'orders', payload.order.id] as const
          const cachedOrder = queryClient.getQueryData<{ version?: number }>(orderKey)
          const knownVersion = Math.max(
            eventVersions.get(`order:${userId}:${payload.order.id}`) ?? 0,
            cachedOrder?.version ?? 0,
          )
          if (payload.version <= knownVersion) return

          eventVersions.set(`order:${userId}:${payload.order.id}`, payload.version)
          queryClient.setQueryData(orderKey, payload.order)
          if (payload.order.status === 'confirmed') {
            void queryClient.invalidateQueries({ queryKey: ['cart'] })
          }
        }

        socket.on('connect', handleConnect)
        socket.on('session.ready', handleSessionReady)
        socket.on('disconnect', handleDisconnect)
        socket.on('connect_error', handleConnectError)
        socket.io.on('reconnect_attempt', handleReconnectAttempt)
        socket.on('nft.updated', handleNftUpdated)
        socket.on('order.updated', handleOrderUpdated)
        socket.connect()

        cleanupSocket = () => {
          socket.off('connect', handleConnect)
          socket.off('session.ready', handleSessionReady)
          socket.off('disconnect', handleDisconnect)
          socket.off('connect_error', handleConnectError)
          socket.io.off('reconnect_attempt', handleReconnectAttempt)
          socket.off('nft.updated', handleNftUpdated)
          socket.off('order.updated', handleOrderUpdated)
          socket.disconnect()
        }
      } catch (error) {
        if (disposed) return
        console.error('Failed to initialize real-time updates.', error)
        setConnectionStatus('disconnected')
      }
    }

    void connect()
    return () => {
      disposed = true
      cleanupSocket?.()
    }
  }, [accessToken, isEnabled, notificationsOwner, queryClient, userId])

  const status = isEnabled ? connectionStatus : 'disabled'
  const statusMessage = {
    disabled: 'Atualizações em tempo real desativadas.',
    connecting: 'Conectando às atualizações em tempo real.',
    connected: 'Atualizações em tempo real conectadas.',
    reconnecting: 'Reconectando às atualizações em tempo real.',
    disconnected: 'Atualizações em tempo real indisponíveis. Os dados serão reconciliados ao reconectar.',
  }[status]

  return (
    <RealtimeUpdatesContext.Provider value={{ connectionStatus: status, nftUpdates }}>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{statusMessage}</span>
      {children}
    </RealtimeUpdatesContext.Provider>
  )
}
