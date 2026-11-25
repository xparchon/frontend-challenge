import { useState } from 'react'
import { Link, Outlet, useNavigate, useRouterState, useSearch } from '@tanstack/react-router'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { useAuth } from '@/features/auth/useAuth'
import { useCart } from '@/features/account/useAccountData'
import { DesktopAuthDialog } from '@/features/pages/StaticPages'

export function AppShell() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const searchState = useSearch({ strict: false })
  const { session, logout } = useAuth()
  const cartQuery = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const isAuthRoute = pathname === '/login' || pathname === '/register'
  const cartCount = cartQuery.data?.items.reduce((count, item) => count + item.quantity, 0) ?? 0
  const isAccountRoute = pathname === '/profile' || pathname === '/wallets'
  const hideMobileChrome = isAuthRoute || pathname === '/cart' || pathname === '/checkout' || isAccountRoute || pathname.startsWith('/market/nfts/') || pathname.startsWith('/orders/')
  const showGlobalFooter = pathname !== '/' && !isAccountRoute && !isAuthRoute

  function searchCatalog(value: string) {
    void navigate({
      to: '/market',
      search: {
        search: value,
        category: String(searchState.category ?? ''),
        network: String(searchState.network ?? ''),
        maxPrice: Number(searchState.maxPrice ?? 12.3),
        sort: String(searchState.sort ?? 'recent'),
        page: 1,
      },
      resetScroll: false,
    })
  }

  function toggleMobileFilters() {
    const filters = document.getElementById('mobile-catalog-filters')
    if (filters instanceof HTMLDetailsElement) filters.open = !filters.open
  }

  function handleLogout() {
    setLogoutError(null)
    void logout()
      .then(() => {
        if (pathname === '/checkout' || pathname === '/profile' || pathname === '/wallets' || pathname.startsWith('/orders/')) {
          void navigate({ to: '/login', search: { returnTo: pathname } })
        }
      })
      .catch(() => setLogoutError('Não foi possível encerrar a sessão. Tente novamente.'))
  }

  return (
    <div className="min-h-screen bg-kurio-ink text-kurio-cream">
      <header className={hideMobileChrome ? 'max-md:hidden pt-6 md:pt-6' : 'pt-10 md:pt-6'}>
        <nav className="layout-container flex h-[45px] items-center justify-between border-b border-kurio-line/40 max-md:border-0" aria-label="Navegação principal">
          <Link to="/" search={{ search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 }} className="hidden font-mono text-xs font-bold tracking-[0.18em] text-kurio-goldStrong md:block" aria-label="Kurio - início">
            KURIO
          </Link>
          <div className="hidden items-center gap-7 text-sm md:flex">
            <Link to="/" search={{ search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 }}>Início</Link>
            <Link to="/market" search={{ search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 }} className="text-kurio-cream/60 hover:text-kurio-goldStrong">Mercado</Link>
            <span className="text-kurio-cream/60">Criadores</span>
            <span className="text-kurio-cream/60">Aprenda</span>
          </div>
          {!hideMobileChrome && (
            <div className="flex h-[45px] flex-1 items-center gap-2 rounded-md bg-kurio-surface text-xs text-kurio-gold/80 md:hidden">
              <label className="flex h-full min-w-0 flex-1 items-center gap-2 pl-3">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[22px] w-[22px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
                <input aria-label="Buscar NFTs" value={String(searchState.search ?? '')} onChange={(event) => searchCatalog(event.target.value)} className="min-w-0 flex-1 bg-transparent text-kurio-cream outline-none placeholder:text-kurio-gold/80" placeholder="Explorar coleções" />
              </label>
              <button type="button" onClick={toggleMobileFilters} aria-label="Abrir filtros" className="grid h-[45px] w-[45px] shrink-0 place-items-center rounded-r-md text-kurio-goldStrong hover:bg-kurio-ink/60">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 6h16M7 12h10m-7 6h4" /><circle cx="8" cy="6" r="1.5" fill="currentColor" /><circle cx="15" cy="12" r="1.5" fill="currentColor" /></svg>
              </button>
            </div>
          )}
          <div className="hidden items-center gap-3 text-xs md:flex">
            <Link to="/market" search={{ search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 }} aria-label="Buscar NFTs" className="rounded-md p-2 hover:bg-kurio-surface">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
            </Link>
            <Link to="/cart" className="relative rounded-md p-2 hover:bg-kurio-surface" aria-label={`Abrir carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.6L21 8H6" />
                <circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" />
              </svg>
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-kurio-goldStrong text-[10px] font-bold text-kurio-ink">{cartCount}</span>
            </Link>
            {session ? (
              <>
                <Link to="/profile" className="rounded-md px-2 py-2 font-semibold text-kurio-goldStrong hover:bg-kurio-surface">{session.user.displayName}</Link>
                <button type="button" onClick={handleLogout} className="rounded-md bg-kurio-goldStrong px-3 py-2 font-semibold text-kurio-ink hover:bg-kurio-gold">Sair</button>
              </>
            ) : (
              <button type="button" aria-haspopup="dialog" aria-expanded={loginDialogOpen} aria-controls="desktop-auth-dialog" onClick={() => setLoginDialogOpen(true)} className="rounded-md bg-kurio-goldStrong px-3 py-2 font-semibold text-kurio-ink hover:bg-kurio-gold">
                Entrar
              </button>
            )}
          </div>
        </nav>
      </header>
      {logoutError && <p role="alert" className="layout-container py-2 text-right text-xs text-red-300">{logoutError}</p>}
      <main className={hideMobileChrome ? 'pb-0' : 'pb-[126px] md:pb-0'}>
        <Outlet />
      </main>
      {showGlobalFooter && (
        <div className={hideMobileChrome ? 'hidden md:block' : ''}>
          <SiteFooter />
        </div>
      )}
      {!hideMobileChrome && <nav aria-label="Navegação mobile" className="fixed inset-x-0 bottom-0 z-30 h-[126px] w-screen md:hidden">
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 414 126" preserveAspectRatio="none">
          <path d="M0 47C0 38.163 7.163 31 16 31H152C172 31 173 65 207 65S242 31 262 31H398C406.837 31 414 38.163 414 47V126H0Z" fill="#241611" />
        </svg>
        <Link to="/" search={{ search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 }} aria-label="Início" className="absolute left-[11.1%] top-[71px] z-10 -translate-x-1/2 text-[#d28a4c]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
        </Link>
        <Link to="/login" aria-label="Favoritos" className="absolute left-[28.5%] top-[71px] z-10 -translate-x-1/2 text-[#dfc6a5]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 21s-8.5-5.2-8.5-11.4a4.5 4.5 0 0 1 8.5-2.1 4.5 4.5 0 0 1 8.5 2.1C20.5 15.8 12 21 12 21Z" /></svg>
        </Link>
        <Link to="/cart" aria-label="Carrinho" className="absolute left-[72.9%] top-[71px] z-10 -translate-x-1/2 text-[#dfc6a5]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M2.5 3h2.2l2.2 11.1a2.1 2.1 0 0 0 2.1 1.7h8.8a2.1 2.1 0 0 0 2-1.6L21.5 7H6.2l-.5-2.5H2.5V3Zm7 14.2a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Zm8.2 0a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z" /></svg>
        </Link>
        {session ? (
          <Link to="/profile" aria-label="Perfil" className="absolute left-[87.9%] top-[71px] z-10 -translate-x-1/2 text-[#dfc6a5]">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><circle cx="12" cy="7.5" r="4" /><path d="M4 21c.1-4.3 3.5-7.2 8-7.2s7.9 2.9 8 7.2H4Z" /></svg>
          </Link>
        ) : (
          <Link to="/login" aria-label="Perfil" className="absolute left-[87.9%] top-[71px] z-10 -translate-x-1/2 text-[#dfc6a5]">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><circle cx="12" cy="7.5" r="4" /><path d="M4 21c.1-4.3 3.5-7.2 8-7.2s7.9 2.9 8 7.2H4Z" /></svg>
          </Link>
        )}
        <button type="button" aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation-menu" onClick={() => setMobileMenuOpen((isOpen) => !isOpen)} className="mobile-menu-button absolute left-1/2 top-0 z-10 grid h-[65px] w-[65px] -translate-x-1/2 place-items-center rounded-full text-kurio-cream">
          <svg aria-hidden="true" viewBox="0 0 27 24" className="h-6 w-[27px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.3 10.3V5.2A5.2 5.2 0 0 1 6.5 0h5.1" />
            <path d="M15.1 0h5.1a5.2 5.2 0 0 1 5.2 5.2v5.1" />
            <path d="M1.3 13.7v5.1A5.2 5.2 0 0 0 6.5 24h5.1" />
            <path d="M15.1 24h5.1a5.2 5.2 0 0 0 5.2-5.2v-5.1" />
            <path d="M0 12h26.8" />
          </svg>
        </button>
      </nav>}
      {!hideMobileChrome && <nav id="mobile-navigation-menu" aria-label="Menu mobile" hidden={!mobileMenuOpen} className="fixed inset-x-6 bottom-[126px] z-40 rounded-xl border border-kurio-line bg-kurio-surface p-4 shadow-xl md:hidden">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold text-kurio-goldStrong">Menu</h2>
          <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu" className="rounded px-2 py-1 text-kurio-cream/70 hover:bg-kurio-ink">Fechar</button>
        </div>
        <div className="grid gap-1">
          <Link to="/" search={{ search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 }} onClick={() => setMobileMenuOpen(false)} className="rounded px-3 py-2 text-sm hover:bg-kurio-ink">Início</Link>
          <Link to="/market" search={{ search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 }} onClick={() => setMobileMenuOpen(false)} className="rounded px-3 py-2 text-sm hover:bg-kurio-ink">Mercado</Link>
          <Link to="/cart" onClick={() => setMobileMenuOpen(false)} className="rounded px-3 py-2 text-sm hover:bg-kurio-ink">Carrinho</Link>
          {session ? (
            <>
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="rounded px-3 py-2 text-sm hover:bg-kurio-ink">Meu perfil ({session.user.displayName})</Link>
              <button type="button" onClick={handleLogout} className="rounded px-3 py-2 text-left text-sm hover:bg-kurio-ink">Sair</button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="rounded px-3 py-2 text-sm hover:bg-kurio-ink">Entrar</Link>
          )}
        </div>
      </nav>}
      {loginDialogOpen && <DesktopAuthDialog onClose={() => setLoginDialogOpen(false)} />}
    </div>
  )
}
