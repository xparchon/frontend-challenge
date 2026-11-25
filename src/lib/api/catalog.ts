import { api } from '@/lib/api/axios'
import type { PaginatedResponse } from '@/types/api'
import type { Nft } from '@/types/nft'

export interface CatalogFilters {
  search?: string
  category?: string
  network?: string
  maxPrice?: string
  sort?: 'recent' | 'new' | 'popular' | 'price-asc' | 'price-desc'
  page: number
  pageSize: number
}

export async function getCatalog(filters: CatalogFilters) {
  const { data } = await api.get<PaginatedResponse<Nft>>('/nfts', { params: filters })
  return data
}
