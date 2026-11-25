import { api } from '@/lib/api/axios'
import type { Nft } from '@/types/nft'

export async function getNft(nftId: string) {
  const { data } = await api.get<Nft>(`/nfts/${encodeURIComponent(nftId)}`)
  return data
}
