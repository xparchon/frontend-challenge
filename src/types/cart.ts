export interface CartItem {
  nftId: string
  name: string
  tokenId: string
  image: string
  network: 'Ethereum' | 'Polygon' | 'Solana'
  edition: string
  quantity: number
  unitPrice: string
  version: number
}

export interface Cart {
  userId: string | null
  items: CartItem[]
  couponCode: string | null
  subtotal: string
  discount: string
  networkFee: string
  estimatedFee: string
  total: string
  quoteVersion: number
}
