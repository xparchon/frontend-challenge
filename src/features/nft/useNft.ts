import { useQuery } from '@tanstack/react-query'
import { getNft } from '@/lib/api/nft'

export function useNft(nftId: string) {
  return useQuery({
    queryKey: ['nft', nftId],
    queryFn: () => getNft(nftId),
    enabled: nftId.length > 0,
  })
}
