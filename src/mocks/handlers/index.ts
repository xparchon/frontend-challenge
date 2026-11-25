import { http, HttpResponse } from 'msw'
import type { PaginatedResponse } from '@/types/api'
import type { Nft } from '@/types/nft'
import { authHandlers } from '@/mocks/handlers/auth'
import { accountCommerceHandlers, getMockNft } from '@/mocks/handlers/accountCommerce'
import { realtimeHandlers } from '@/mocks/handlers/realtime'
import { isNetworkUnavailable, waitForConfiguredNetworkLatency } from '@/mocks/networkScenarios'
import { nfts } from '@/mocks/fixtures/nfts'

export const handlers = [
  http.all('/api/*', () => isNetworkUnavailable() ? Response.error() : undefined),
  ...authHandlers,
  ...accountCommerceHandlers,
  ...realtimeHandlers,

  http.get('/api/nfts', async ({ request }) => {
    await waitForConfiguredNetworkLatency(request)
    if (localStorage.getItem('kurio.mock.catalogFailure') === 'true') {
      return HttpResponse.json({ code: 'SERVICE_UNAVAILABLE', message: 'Catálogo temporariamente indisponível.' }, { status: 503 })
    }

    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '6')
    const search = url.searchParams.get('search')?.trim().toLowerCase()
    const category = url.searchParams.get('category')
    const network = url.searchParams.get('network')
    const maxPrice = Number(url.searchParams.get('maxPrice') ?? '12.30')
    const sort = url.searchParams.get('sort') ?? 'recent'

    let filtered = nfts.map(getMockNft)
    if (search) filtered = filtered.filter((item) => `${item.name} ${item.collection} ${item.attributes.join(' ')}`.toLowerCase().includes(search))
    if (category) filtered = filtered.filter((item) => item.category === category)
    if (network) filtered = filtered.filter((item) => item.network === network)
    filtered = filtered.filter((item) => Number(item.price) <= maxPrice)
    if (sort === 'new') filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (sort === 'price-asc') filtered.sort((a, b) => Number(a.price) - Number(b.price))
    if (sort === 'price-desc') filtered.sort((a, b) => Number(b.price) - Number(a.price))
    if (sort === 'popular') filtered.sort((a, b) => b.rating - a.rating)

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const safePage = Math.min(Math.max(page, 1), totalPages)
    const offset = (safePage - 1) * pageSize
    const response: PaginatedResponse<Nft> = {
      items: filtered.slice(offset, offset + pageSize),
      page: safePage,
      pageSize,
      total: filtered.length,
      totalPages,
    }
    return HttpResponse.json(response)
  }),

  http.get('/api/nfts/:nftId', async ({ params, request }) => {
    await waitForConfiguredNetworkLatency(request)
    const nftId = String(params.nftId)
    const item = nfts.find((candidate) => candidate.id === nftId)
    if (!item) {
      return HttpResponse.json({ code: 'NOT_FOUND', message: 'NFT não encontrado.' }, { status: 404 })
    }
    return HttpResponse.json(getMockNft(item))
  }),
]
