import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { getAuthorizedUser } from '@/mocks/handlers/auth'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/types/realtime'
import type { Nft } from '@/types/nft'
import type { Order } from '@/types/order'

const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const socketIo = ws.link(`${socketProtocol}//${window.location.host}/socket.io`)
type SocketClient = ReturnType<typeof toSocketIo>['client']

interface ConnectedClient {
  socket: SocketClient
  userId: string | null
}

const connectedClients = new Set<ConnectedClient>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function authorizeSocket(accessToken: unknown) {
  if (typeof accessToken !== 'string' || !accessToken) return null
  const request = new Request('http://kurio.local/api/session', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return getAuthorizedUser(request)
}

export function createNftUpdatedEvent(previous: Nft, nft: Nft): NftUpdatedEvent {
  return {
    eventId: `nft:${nft.id}:${nft.version}`,
    resourceId: `nft:${nft.id}`,
    version: nft.version,
    updatedAt: new Date().toISOString(),
    previous: {
      price: previous.price,
      editionsAvailable: previous.editionsAvailable,
    },
    nft,
  }
}

export function publishNftUpdated(event: NftUpdatedEvent) {
  for (const client of connectedClients) {
    client.socket.emit('nft.updated', event)
  }
}

export function createOrderUpdatedEvent(order: Order): OrderUpdatedEvent {
  return {
    eventId: `order:${order.id}:${order.version}`,
    resourceId: `order:${order.id}`,
    userId: order.userId,
    version: order.version,
    updatedAt: order.updatedAt,
    order,
  }
}

export function publishOrderUpdated(order: Order) {
  const event = createOrderUpdatedEvent(order)
  for (const client of connectedClients) {
    if (client.userId === order.userId) client.socket.emit('order.updated', event)
  }
}

const realtimeHandler = socketIo.addEventListener('connection', (connection) => {
  const socket = toSocketIo(connection).client
  const connectedClient: ConnectedClient = { socket, userId: null }
  connectedClients.add(connectedClient)

  socket.on('session.subscribe', (_event, payload: unknown) => {
    const token = isRecord(payload) ? payload.accessToken : null
    const user = authorizeSocket(token)
    connectedClient.userId = user?.id ?? null
    socket.emit('session.ready', { userId: connectedClient.userId })
  })

  connection.client.addEventListener('close', () => {
    connectedClients.delete(connectedClient)
  })
})

export const realtimeHandlers = [realtimeHandler]
