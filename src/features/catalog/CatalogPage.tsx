import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useCatalog } from '@/features/catalog/useCatalog'
import { useRealtimeUpdates } from '@/features/realtime/useRealtimeUpdates'
import { SiteFooter } from '@/components/layout/SiteFooter'
import type { CatalogFilters } from '@/lib/api/catalog'

interface CatalogPageProps {
  showHero?: boolean
  basePath?: '/' | '/market'
}

export function CatalogPage({ showHero = true, basePath = '/' }: CatalogPageProps) {
  const navigate = useNavigate()
  const searchState = useSearch({ strict: false })
  const { nftUpdates } = useRealtimeUpdates()
  const latestNftUpdate = Object.values(nftUpdates)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0]
  const filters: CatalogFilters = {
    search: String(searchState.search ?? ''),
    category: String(searchState.category ?? ''),
    network: String(searchState.network ?? ''),
    maxPrice: String(searchState.maxPrice ?? 12.3),
    sort: String(searchState.sort ?? 'recent') as CatalogFilters['sort'],
    page: Number(searchState.page ?? 1),
    pageSize: 9,
  }
  const catalog = useCatalog(filters)

  function updateUrl(next: Record<string, string | number>) {
    void navigate({
      to: basePath,
      search: (previous) => ({
        search: String(next.search ?? previous.search ?? ''),
        category: String(next.category ?? previous.category ?? ''),
        network: String(next.network ?? previous.network ?? ''),
        maxPrice: Number(next.maxPrice ?? previous.maxPrice ?? 12.3),
        sort: String(next.sort ?? previous.sort ?? 'recent'),
        page: Number(next.page ?? previous.page ?? 1),
      }),
      resetScroll: false,
    })
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {showHero && (
        <>
          <section className="mt-8 hidden min-[1280px]:block">
            <div className="layout-container grid h-[450px] grid-cols-[600px_450px] gap-[110px] pl-10">
              <div className="relative mt-[43px] h-[364px] w-[600px]">
                <p className="absolute left-0 top-0 font-mono text-sm leading-4 text-kurio-cream/80">Bem-vindo à Kurio</p>
                <h1 className="absolute left-0 top-6 max-w-[600px] font-mono text-[43px] font-bold leading-[70px]">
                  SEJA DONO DO FUTURO<br />DA ARTE DIGITAL
                </h1>
                <p className="absolute left-0 top-[168px] max-w-[557px] text-sm leading-6 text-kurio-gold/90">
                  Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
                </p>
                <a href="#catalogo" className="absolute left-0 top-[272px] inline-flex h-10 w-[140px] items-center justify-center rounded-md bg-kurio-goldStrong text-base font-bold text-kurio-ink">
                  EXPLORAR
                </a>
              </div>
              <img src="/assets/images/emerald-ape.jpeg" alt="Arte destacada Emerald Ape" className="h-[450px] w-[450px] rounded-xl object-cover" />
          </div>
          </section>
          <section className="layout-container relative mt-4 h-[190px] overflow-hidden rounded-lg bg-[#c4aa8b] min-[1280px]:hidden">
            <div aria-hidden="true" className="absolute -left-20 -top-8 h-[248px] w-[248px] rounded-full bg-[#e2d0b6]/70" />
            <div aria-hidden="true" className="absolute left-[73px] -top-[10px] h-[248px] w-[248px] rounded-full bg-[#a88f72]/35" />
            <div className="absolute left-4 top-[5.5px] h-[179px] w-[calc(100%_-_32px)]">
              <div className="relative h-full w-[188px]">
                <p className="absolute left-0 top-0 font-mono text-[10px] leading-4 text-kurio-ink">Bem-vindo à Kurio</p>
                <h1 className="absolute left-0 top-[22px] w-[190px] font-mono text-[21px] font-bold leading-[29px] text-kurio-ink">
                  SEJA DONO DA<br />CULTURA DIGITAL
                </h1>
                <p className="absolute left-0 top-[86px] w-[188px] text-[10px] leading-[18px] text-kurio-ink/80">
                  Descubra NFTs selecionados de criadores do mundo todo.
                </p>
                <a href="#catalogo" className="absolute left-0 top-[140px] inline-flex h-4 items-center gap-1 font-mono text-[8px] font-bold text-kurio-ink">
                  EXPLORAR <span aria-hidden="true">→</span>
                </a>
              </div>
              <img src="/assets/images/emerald-ape.jpeg" alt="" className="absolute right-0 top-0 h-[146px] w-[138px] rounded-md object-cover" />
            </div>
          </section>
        </>
      )}

      <section id="catalogo" className={`layout-container ${showHero ? 'home-catalog-section' : 'market-catalog-section'}`}>
        <details id="mobile-catalog-filters" className="fixed right-6 top-[96px] z-40 md:hidden">
          <summary className="hidden">Filtros do catálogo</summary>
          <div className="mt-2 w-[calc(100vw_-_48px)] max-w-sm rounded-md border border-kurio-line bg-kurio-surface p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Filtros</h2>
              <button type="button" onClick={() => {
                const panel = document.getElementById('mobile-catalog-filters')
                if (panel instanceof HTMLDetailsElement) panel.open = false
              }} className="text-xs text-kurio-goldStrong">Fechar</button>
            </div>
            <CatalogFiltersPanel category={filters.category ?? ''} network={filters.network ?? ''} maxPrice={filters.maxPrice ?? '12.30'} onCategory={(category) => updateUrl({ category, page: 1 })} onNetwork={(network) => updateUrl({ network, page: 1 })} onMaxPrice={(maxPrice) => updateUrl({ maxPrice, page: 1 })} onClear={() => updateUrl({ category: '', network: '', maxPrice: 12.3, page: 1 })} />
          </div>
        </details>

        <div className="grid gap-5 lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-12">
          <aside className="catalog-sidebar hidden lg:block">
            <CatalogFiltersPanel
              category={filters.category ?? ''}
              network={filters.network ?? ''}
              maxPrice={filters.maxPrice ?? '12.30'}
              onCategory={(category) => updateUrl({ category, page: 1 })}
              onNetwork={(network) => updateUrl({ network, page: 1 })}
              onMaxPrice={(maxPrice) => updateUrl({ maxPrice, page: 1 })}
              onClear={() => updateUrl({ category: '', network: '', maxPrice: 12.3, page: 1 })}
            />
            <div className="catalog-featured mt-6 overflow-hidden rounded-md border border-kurio-line bg-kurio-surface p-3 text-center">
              <p className="font-mono text-sm font-bold text-kurio-goldStrong">NFT EM DESTAQUE</p>
              <p className="mt-1 text-xs font-bold">OFERTA LIMITADA</p>
              <img src="/assets/images/sage-nomad.jpeg" alt="NFT em destaque da coleção Kurio Nomads" className="mt-2 aspect-square w-full rounded-md object-cover" />
              <p className="mt-2 text-left text-xs">Sage Nomad #009</p>
              <p className="mt-1 text-left text-xs text-kurio-goldStrong">1.69 ETH</p>
            </div>
          </aside>

          <div className="min-w-0">
            {latestNftUpdate && (
              <p role="status" aria-live="polite" className="sr-only">
                Atualização em tempo real: {latestNftUpdate.nft.name}, preço {latestNftUpdate.nft.price} ETH e {latestNftUpdate.nft.editionsAvailable} edições disponíveis.
              </p>
            )}
            <div className="flex h-5 items-center justify-between md:h-[18px]">
              <nav className="flex h-full w-[332px] items-center gap-1 text-sm md:w-[376px] md:justify-between md:gap-0" aria-label="Vistas do catálogo">
                <button type="button" onClick={() => updateUrl({ sort: 'recent', page: 1 })} className={`h-full w-[110px] shrink-0 border-b-2 text-left md:w-[118px] ${filters.sort === 'recent' ? 'border-kurio-goldStrong text-kurio-goldStrong' : 'border-transparent text-kurio-cream/75'}`}>Todos os NFTs</button>
                <button type="button" onClick={() => updateUrl({ sort: 'new', page: 1 })} className={`h-full w-[143px] shrink-0 border-b-2 text-left md:w-[154px] ${filters.sort === 'new' ? 'border-kurio-goldStrong text-kurio-goldStrong' : 'border-transparent text-kurio-cream/75'}`}>Novos lançamentos</button>
                <button type="button" onClick={() => updateUrl({ sort: 'popular', page: 1 })} className={`ml-3 h-full w-[59px] shrink-0 border-b-2 text-left md:ml-0 md:w-[64px] ${filters.sort === 'popular' ? 'border-kurio-goldStrong text-kurio-goldStrong' : 'border-transparent text-kurio-cream/75'}`}>Em alta</button>
              </nav>
              <label className="hidden w-[300px] items-center justify-end gap-2 text-[11px] text-kurio-cream/75 md:flex">
                Ordenar por:
                <select aria-label="Ordenar NFTs" value={filters.sort === 'popular' ? 'popular' : filters.sort === 'price-asc' || filters.sort === 'price-desc' ? filters.sort : 'recent'} onChange={(event) => updateUrl({ sort: event.target.value, page: 1 })} className="max-w-40 bg-transparent text-kurio-cream outline-none">
                  <option value="recent">Listados recentemente</option>
                  <option value="new">Novos lançamentos</option>
                  <option value="popular">Em alta</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                </select>
              </label>
            </div>

            <form className="my-5 hidden h-7 grid-cols-[1fr_150px] gap-3 md:grid" onSubmit={(event) => event.preventDefault()}>
              <label className="sr-only" htmlFor="catalog-search-desktop">Buscar NFTs</label>
              <input id="catalog-search-desktop" value={filters.search} onChange={(event) => updateUrl({ search: event.target.value, page: 1 })} className="h-7 rounded-md border border-kurio-line bg-kurio-surface px-3 text-xs outline-none focus:border-kurio-goldStrong" placeholder="Buscar NFTs ou coleções" />
              <p className="self-center text-right text-[11px] text-kurio-cream/50">{catalog.data?.total ?? 0} itens encontrados</p>
            </form>

            {catalog.isLoading ? <CatalogSkeleton /> : catalog.isError ? (
              <div className="rounded-lg border border-red-400/40 p-6">
                <p>Não foi possível carregar o catálogo.</p>
                <button type="button" onClick={() => catalog.refetch()} className="mt-4 rounded-md border border-kurio-gold px-4 py-2">Tentar novamente</button>
              </div>
            ) : catalog.data?.items.length === 0 ? (
              <div className="rounded-lg border border-kurio-line p-10 text-center text-kurio-cream/70">Nenhum NFT corresponde aos filtros selecionados.</div>
            ) : (
              <>
                <div className="catalog-nft-grid mt-4 grid grid-cols-2 gap-x-4 gap-y-6 md:mt-0 md:grid-cols-3 md:gap-x-[34px] md:gap-y-[72px] lg:max-w-[842px]">
                  {catalog.data?.items.map((nft) => (
                    <Link key={nft.id} to="/market/nfts/$nftId" params={{ nftId: nft.id }} className="nft-card group min-w-0">
                      <div className="nft-card-art relative bg-kurio-surface transition-colors group-hover:bg-kurio-gold/20">
                        <img src={nft.image} alt={nft.name} className="nft-card-image rounded-md object-cover transition-transform group-hover:scale-[1.02]" />
                      </div>
                      <div className="nft-card-meta">
                        <h2 className="truncate">{nft.name}</h2>
                        <p className="font-bold text-kurio-goldStrong">{nft.price} ETH</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-[88px] flex items-center justify-center gap-2" aria-label="Paginação">
                  {Array.from({ length: catalog.data?.totalPages ?? 1 }, (_, index) => index + 1).map((page) => (
                    <button key={page} type="button" onClick={() => updateUrl({ page })} className={`h-[35px] w-[35px] rounded-sm text-xs ${page === filters.page ? 'bg-kurio-goldStrong text-kurio-ink' : 'border border-kurio-line'}`} aria-current={page === filters.page ? 'page' : undefined}>{page}</button>
                  ))}
                  <button type="button" disabled={filters.page >= (catalog.data?.totalPages ?? 1)} onClick={() => updateUrl({ page: filters.page + 1 })} aria-label="Próxima página" className="h-[35px] w-[35px] rounded-sm border border-kurio-line disabled:opacity-40">›</button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {showHero && <HomeEditorialSections />}
    </div>
  )
}

interface CatalogFiltersPanelProps {
  category: string
  network: string
  maxPrice: string
  onCategory: (category: string) => void
  onNetwork: (network: string) => void
  onMaxPrice: (maxPrice: string) => void
  onClear: () => void
}

function CatalogFiltersPanel({ category, network, maxPrice, onCategory, onNetwork, onMaxPrice, onClear }: CatalogFiltersPanelProps) {
  const categories = ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Colecionáveis', 'Generativa', 'Jogos', 'Assinaturas', 'Utilidade']
  const networks = ['Ethereum', 'Polygon', 'Solana']

  return (
    <div className="rounded-md bg-kurio-surface px-3 py-4">
      <h2 className="mb-3 text-sm font-bold">Coleções</h2>
      <div className="space-y-1">
        {categories.map((item) => (
          <button key={item} type="button" onClick={() => onCategory(category === item ? '' : item)} className={`flex w-full justify-between rounded px-2 py-1.5 text-left text-[11px] ${category === item ? 'bg-kurio-gold/15 text-kurio-goldStrong' : 'text-kurio-cream/85 hover:bg-kurio-ink/50'}`}>
            {item}<span aria-hidden="true">›</span>
          </button>
        ))}
      </div>
      <div className="mt-5 border-t border-kurio-line/70 pt-4">
        <label htmlFor="max-price" className="block text-xs font-bold">Faixa de preço</label>
        <input id="max-price" type="range" min="0.02" max="12.30" step="0.01" value={Math.min(Number(maxPrice) || 12.3, 12.3)} onChange={(event) => onMaxPrice(event.target.value)} className="mt-3 w-full accent-kurio-goldStrong" />
        <p className="mt-1 text-[10px] text-kurio-cream/60">Preço: 0,02 - {Number(maxPrice).toFixed(2)} ETH</p>
      </div>
      <div className="mt-5 border-t border-kurio-line/70 pt-4">
        <h3 className="mb-2 text-xs font-bold">Rede</h3>
        <div className="space-y-1">
          {networks.map((item) => (
            <button key={item} type="button" onClick={() => onNetwork(network === item ? '' : item)} className={`flex w-full justify-between rounded px-2 py-1.5 text-left text-[11px] ${network === item ? 'text-kurio-goldStrong' : 'text-kurio-cream/85 hover:bg-kurio-ink/50'}`}>
              <span>{network === item ? '●' : '○'} &nbsp;{item}</span>
            </button>
          ))}
        </div>
      </div>
      {(category || network || Number(maxPrice) < 12.3) && (
        <button type="button" onClick={onClear} className="mt-4 text-[10px] text-kurio-goldStrong underline">Limpar filtros</button>
      )}
    </div>
  )
}

function HomeEditorialSections() {
  return (
    <>
      <section className="home-promos layout-container mt-[96px] grid h-[250px] grid-cols-2 gap-7">
        <article className="grid h-[250px] overflow-hidden rounded-md bg-kurio-surface md:grid-cols-2">
          <img src="/assets/images/emerald-ape.jpeg" alt="" className="h-full w-full object-cover" />
          <div className="flex flex-col items-center justify-center p-5 text-center">
            <h2 className="max-w-[206px] text-base font-bold leading-6">Lançamentos gênesis de edição limitada</h2>
            <p className="mt-2 max-w-[263px] text-xs leading-5 text-kurio-cream/85">Colecione edições escassas diretamente dos criadores antes da revelação pública.</p>
            <Link to="/market" search={{ search: '', category: '', network: '', sort: 'recent', page: 1, maxPrice: 12.3 }} className="mt-3 rounded bg-kurio-goldStrong px-4 py-2 text-[11px] font-bold text-kurio-ink">Explorar →</Link>
          </div>
        </article>
        <article className="grid h-[250px] overflow-hidden rounded-md bg-kurio-surface md:grid-cols-2">
          <img src="/assets/images/ivory-baron.jpeg" alt="" className="h-full w-full object-cover" />
          <div className="flex flex-col items-center justify-center p-5 text-center">
            <h2 className="max-w-[260px] text-base font-bold leading-6">Arte digital selecionada e muito mais</h2>
            <p className="mt-2 max-w-[252px] text-xs leading-5 text-kurio-cream/85">Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.</p>
            <Link to="/market" search={{ search: '', category: '', network: '', sort: 'recent', page: 1, maxPrice: 12.3 }} className="mt-3 rounded bg-kurio-goldStrong px-4 py-2 text-[11px] font-bold text-kurio-ink">Explorar →</Link>
          </div>
        </article>
      </section>

      <section className="home-blog layout-container mt-[96px]">
        <header className="h-[67px] text-center">
          <h2 className="text-xl font-bold">Diário da Cunhagem</h2>
          <p className="mt-2 text-xs text-kurio-cream/85">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
        </header>
        <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-[repeat(4,268px)]">
          {[
            ['ivory-baron.jpeg', 'Como funciona a propriedade de NFTs', 'Aprenda a colecionar, negociar e verificar ativos digitais.'],
            ['emerald-ape.jpeg', '10 artistas digitais para acompanhar', 'Conheça artistas que moldam a cultura digital.'],
            ['sage-nomad.jpeg', 'Raridade, atributos e procedência', 'Entenda raridade, procedência, direitos autorais e utilidade.'],
            ['golden-beat.jpeg', 'Como proteger sua carteira', 'Proteja sua carteira, seus ativos e sua identidade.'],
          ].map(([image, title, summary], index) => (
            <article key={title} className="home-blog-card h-[369px] overflow-hidden rounded-md bg-kurio-surface">
              <img src={`/assets/images/${image}`} alt="" className="aspect-[1.25] w-full object-cover" />
              <div className="p-3">
                <p className="text-[9px] text-kurio-cream/75">{12 + index} de setembro &nbsp; | &nbsp; Leitura de {index + 2} min</p>
                <h3 className="mt-2 text-xs font-bold leading-4">{title}</h3>
                <p className="mt-2 text-[10px] leading-4 text-kurio-cream/85">{summary}</p>
                <a href="#catalogo" className="mt-2 inline-block text-[10px] text-kurio-goldStrong">Ler mais →</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </>
  )
}

function CatalogSkeleton() {
  return (
    <div role="status" aria-label="Carregando catálogo" className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} aria-hidden="true" className="overflow-hidden rounded-lg border border-kurio-line/30">
          <div className="skeleton-shimmer aspect-square" />
          <div className="space-y-3 p-4">
            <div className="skeleton-shimmer h-5 w-2/3 rounded" />
            <div className="skeleton-shimmer h-4 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
