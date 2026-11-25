import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getCatalog, type CatalogFilters } from '@/lib/api/catalog'

export function useCatalog(filters: CatalogFilters) {
  return useQuery({
    queryKey: ['nfts', filters],
    queryFn: () => getCatalog(filters),
    placeholderData: keepPreviousData,
  })
}
