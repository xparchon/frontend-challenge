import type { Nft } from '@/types/nft'
import type { Order } from '@/types/order'

export interface NftUpdatedEvent {
  eventId: string
  resourceId: string
  version: number
  updatedAt: string
  previous: Pick<Nft, 'price' | 'editionsAvailable'>
  nft: Nft
}

export interface OrderUpdatedEvent {
  eventId: string
  resourceId: string
  userId: string
  version: number
  updatedAt: string
  order: Order
}
