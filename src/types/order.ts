export type OrderStatus = 'pending' | 'confirmed' | 'rejected'

export interface Order {
  id: string
  userId: string
  idempotencyKey: string
  status: OrderStatus
  transactionReference: string
  walletId: string
  walletAddress: string
  walletNetwork: string
  createdAt: string
  updatedAt: string
  version: number
  receipt: {
    items: Array<{
      nftId: string
      name: string
      tokenId: string
      edition: string
      quantity: number
      unitPrice: string
      subtotal: string
      image: string
    }>
    subtotal: string
    discount: string
    networkFee: string
    total: string
    quoteVersion: number
  }
}
