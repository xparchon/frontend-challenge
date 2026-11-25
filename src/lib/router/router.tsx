import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/AppShell'
import { getCurrentSession } from '@/lib/api/auth'
import { queryClient } from '@/lib/query/queryClient'
import { CatalogPage } from '@/features/catalog/CatalogPage'
import { MarketPage } from '@/features/market/MarketPage'
import { NftDetailsPage } from '@/features/nft/NftDetailsPage'
import { AuthPage } from '@/features/pages/StaticPages'
import { CartPage, CheckoutPage, OrderConfirmationPage } from '@/features/pages/CommercePages'
import { ProfilePage, WalletsPage } from '@/features/pages/AccountPages'

const rootRoute = createRootRoute({
  component: AppShell,
})

function safeReturnTo(value: unknown): string | undefined {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : undefined
}

async function requireSession({ location }: { location: { href: string } }) {
  const session = await queryClient.ensureQueryData({
    queryKey: ['auth', 'session'],
    queryFn: getCurrentSession,
    staleTime: 30_000,
  })

  if (!session) {
    throw redirect({
      to: '/login',
      search: { returnTo: location.href },
    })
  }
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search) => ({
    search: typeof search.search === 'string' ? search.search : '',
    category: typeof search.category === 'string' ? search.category : '',
    network: typeof search.network === 'string' ? search.network : '',
    maxPrice: typeof search.maxPrice === 'number' ? search.maxPrice : Number(search.maxPrice) || 12.3,
    sort: typeof search.sort === 'string' ? search.sort : 'recent',
    page: typeof search.page === 'number'
      ? search.page
      : typeof search.page === 'string'
        ? Number(search.page) || 1
        : 1,
  }),
  component: CatalogPage,
})

const marketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/market',
  validateSearch: (search) => ({
    search: typeof search.search === 'string' ? search.search : '',
    category: typeof search.category === 'string' ? search.category : '',
    network: typeof search.network === 'string' ? search.network : '',
    maxPrice: typeof search.maxPrice === 'number' ? search.maxPrice : Number(search.maxPrice) || 12.3,
    sort: typeof search.sort === 'string' ? search.sort : 'recent',
    page: typeof search.page === 'number'
      ? search.page
      : typeof search.page === 'string'
        ? Number(search.page) || 1
        : 1,
  }),
  component: MarketPage,
})

const marketNftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/market/nfts/$nftId',
  component: function NftRoute() {
    const { nftId } = marketNftRoute.useParams()
    return <NftDetailsPage nftId={nftId} />
  },
})

const legacyNftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nfts/$nftId',
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/market/nfts/$nftId',
      params: { nftId: params.nftId },
    })
  },
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: CartPage,
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  beforeLoad: requireSession,
  component: CheckoutPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search): { returnTo?: string } => {
    const returnTo = safeReturnTo(search.returnTo)
    return returnTo ? { returnTo } : {}
  },
  component: function LoginRoute() {
    const { returnTo } = loginRoute.useSearch()
    return <AuthPage mode="login" returnTo={returnTo} />
  },
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  validateSearch: (search): { returnTo?: string } => {
    const returnTo = safeReturnTo(search.returnTo)
    return returnTo ? { returnTo } : {}
  },
  component: function RegisterRoute() {
    const { returnTo } = registerRoute.useSearch()
    return <AuthPage mode="register" returnTo={returnTo} />
  },
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: requireSession,
  component: ProfilePage,
})

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wallets',
  validateSearch: (search): { returnTo?: '/checkout' } => ({
    returnTo: search.returnTo === '/checkout' ? '/checkout' : undefined,
  }),
  beforeLoad: requireSession,
  component: function WalletsRoute() {
    const { returnTo } = walletsRoute.useSearch()
    return <WalletsPage returnTo={returnTo} />
  },
})

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders/$orderId',
  beforeLoad: requireSession,
  component: function OrderRoute() {
    const { orderId } = orderRoute.useParams()
    return <OrderConfirmationPage orderId={orderId} />
  },
})

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: () => <div className="mx-auto max-w-7xl px-5 py-16">Página não encontrada</div>,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  marketRoute,
  marketNftRoute,
  legacyNftRoute,
  cartRoute,
  checkoutRoute,
  loginRoute,
  registerRoute,
  profileRoute,
  walletsRoute,
  orderRoute,
  notFoundRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
