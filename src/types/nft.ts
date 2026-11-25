export type NftEdition = '1/1' | '1/10' | '1/50' | 'OPEN'

export interface Nft {
  id: string
  name: string
  collection: string
  description: string
  image: string
  price: string
  originalPrice?: string
  category: string
  network: 'Ethereum' | 'Polygon' | 'Solana'
  edition: NftEdition
  editionsAvailable: number
  rating: number
  reviews: number
  tokenId: string
  contractAddress: string
  creatorRoyalty: string
  attributes: string[]
  createdAt: string
  version: number
}
