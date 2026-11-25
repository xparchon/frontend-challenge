import { useState } from 'react'
import axios, { isAxiosError } from 'axios'
import { Link, useNavigate } from '@tanstack/react-router'
import { useAddCartItem, useFavorites, useToggleFavorite } from '@/features/account/useAccountData'
import { useAuth } from '@/features/auth/useAuth'
import { useRealtimeUpdates } from '@/features/realtime/useRealtimeUpdates'
import { useNft } from '@/features/nft/useNft'
import { nfts } from '@/mocks/fixtures/nfts'
import type { NftEdition } from '@/types/nft'

interface NftDetailsPageProps {
  nftId: string
}

const editions: NftEdition[] = ['1/1', '1/10', '1/50', 'OPEN']

export function NftDetailsPage({ nftId }: NftDetailsPageProps) {
  const nftQuery = useNft(nftId)
  const addToCart = useAddCartItem()
  const favoritesQuery = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const { nftUpdates } = useRealtimeUpdates()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [selectedEdition, setSelectedEdition] = useState<NftEdition>('1/50')
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details')
  const [cartError, setCartError] = useState('')
  const [favoriteError, setFavoriteError] = useState('')
  const [favoriteFeedback, setFavoriteFeedback] = useState('')
  const isAuthenticated = Boolean(session)
  const isFavorite = favoritesQuery.data?.includes(nftId) ?? false
  const realtimeUpdate = nftUpdates[nftId]

  const handleBuy = async () => {
    if (!nftQuery.data) return
    setCartError('')
    try {
      await addToCart.mutateAsync({ nftId: nftQuery.data.id, edition: selectedEdition, quantity })
      await navigate({ to: '/cart' })
    } catch (error) {
      const message = axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : 'Não foi possível adicionar este NFT ao carrinho.'
      setCartError(message)
    }
  }

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      await navigate({ to: '/login', search: { returnTo: `/market/nfts/${nftId}` } })
      return
    }

    setFavoriteError('')
    setFavoriteFeedback('')
    try {
      await toggleFavorite.mutateAsync({ nftId, isFavorite })
      setFavoriteFeedback(isFavorite ? 'Removido dos favoritos.' : 'Adicionado aos favoritos.')
    } catch (error) {
      const message = axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : 'Não foi possível atualizar os favoritos. Tente novamente.'
      setFavoriteError(message)
    }
  }

  if (nftQuery.isLoading) return <NftDetailsSkeleton />

  if (nftQuery.isError) {
    const isNotFound = isAxiosError(nftQuery.error) && nftQuery.error.response?.status === 404
    return (
      <div className="mx-auto max-w-7xl px-5 py-20 text-center">
        <h1 className="text-3xl font-semibold">{isNotFound ? 'NFT não encontrado' : 'Não foi possível carregar este NFT'}</h1>
        <p className="mt-3 text-kurio-cream/70">
          {isNotFound ? 'O item pode ter sido removido ou o endereço está incorreto.' : 'Verifique sua conexão e tente novamente.'}
        </p>
        {!isNotFound && (
          <button type="button" onClick={() => nftQuery.refetch()} className="mt-6 rounded-md border border-kurio-gold px-5 py-3 text-kurio-goldStrong">
            Tentar novamente
          </button>
        )}
        <div><Link to="/market" search={{ search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 }} className="mt-6 inline-block text-kurio-goldStrong underline">Voltar ao marketplace</Link></div>
      </div>
    )
  }

  const nft = nftQuery.data
  if (!nft) return null
  const collectionItems = nfts.filter((item) => item.collection === nft.collection && item.id !== nft.id)
  const shareUrl = typeof window === 'undefined' ? '' : window.location.href
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedTitle = encodeURIComponent(`${nft.name} — ${nft.collection}`)

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-8 max-md:min-h-screen max-md:px-0 max-md:pb-0 max-md:pt-3">
      <header className="mb-2 flex items-center justify-between px-[22px] md:hidden">
        <Link to="/market" search={{ search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 }} aria-label="Voltar ao marketplace" className="grid h-8 w-8 place-items-center rounded-full border border-kurio-line text-kurio-goldStrong">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <FavoriteControl
          nftId={nft.id}
          name={nft.name}
          isAuthenticated={isAuthenticated}
          isFavorite={isFavorite}
          pending={favoritesQuery.isLoading || toggleFavorite.isPending}
          onClick={() => void handleFavorite()}
          className="grid h-8 w-8 place-items-center rounded-full border border-kurio-line text-kurio-goldStrong"
        />
      </header>
      <nav aria-label="Trilha de navegação" className="mb-6 hidden text-sm text-kurio-cream/60 md:block">
        <Link to="/" search={{ search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 }} className="hover:text-kurio-goldStrong">Início</Link>
        <span className="mx-2">/</span>
        <Link to="/market" search={{ search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 }} className="hover:text-kurio-goldStrong">Mercado</Link>
        <span className="mx-2">/</span>
        <span className="text-kurio-cream">{nft.name}</span>
      </nav>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-10 max-md:block">
        <div className="grid gap-4 sm:grid-cols-[84px_minmax(0,1fr)] max-md:block lg:h-[484px] lg:grid-cols-[100px_minmax(0,1fr)] lg:gap-4">
          <div className="order-2 hidden grid-cols-4 gap-3 sm:order-1 sm:grid-cols-1 sm:content-start md:grid lg:h-full lg:grid-rows-4 lg:gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="aspect-square min-h-0 overflow-hidden rounded-md border border-kurio-line bg-kurio-surface lg:h-full lg:aspect-auto">
                <img src={nft.image} alt={`${nft.name}, visualização ${index + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
          <div className="order-1 aspect-square overflow-hidden rounded-lg border border-kurio-line/50 bg-kurio-surface sm:order-2 max-md:mx-[22px] max-md:rounded-xl lg:h-full lg:aspect-auto">
            <img src={nft.image} alt={nft.name} className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="max-md:relative max-md:-mt-8 max-md:rounded-t-[24px] max-md:bg-[#21130F] max-md:px-5 max-md:pb-[170px] max-md:pt-6 lg:flex lg:h-[484px] lg:flex-col">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-3xl font-semibold tracking-wide md:text-3xl max-md:font-mono max-md:text-lg">{nft.name}</h1>
            <p className="shrink-0 rounded-full border border-kurio-gold/60 px-2 py-1 text-[10px]"><span className="text-kurio-goldStrong">★</span> {nft.rating} ({nft.reviews})</p>
          </div>
          {realtimeUpdate && realtimeUpdate.version <= nft.version && (
            <p role="status" aria-live="polite" className="mt-2 text-xs text-kurio-goldStrong">
              Atualização ao vivo: preço {realtimeUpdate.nft.price} ETH, {realtimeUpdate.nft.editionsAvailable} edições disponíveis.
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 border-b border-kurio-line pb-2 max-md:hidden">
            <p className="text-2xl font-bold text-kurio-goldStrong">{nft.price} ETH</p>
            {nft.originalPrice && <p className="text-sm text-kurio-cream/45 line-through">{nft.originalPrice} ETH</p>}
          </div>

          <div className="mt-4 max-md:mt-2">
            <h2 className="font-semibold max-md:hidden">Sobre este NFT</h2>
            <p className="mt-2 leading-6 text-kurio-cream/70 max-md:mt-0 max-md:font-mono max-md:text-sm max-md:leading-[1.5]">{nft.description}</p>
          </div>

          <fieldset className="mt-4 max-md:mt-3 lg:order-5">
            <legend className="mb-2 font-semibold max-md:mb-1 max-md:text-sm">Edição:</legend>
            <div className="flex flex-wrap gap-2">
              {editions.map((edition) => (
                <button
                  key={edition}
                  type="button"
                  aria-pressed={selectedEdition === edition}
                  onClick={() => setSelectedEdition(edition)}
                  className={`rounded-full border px-3 py-1.5 text-sm max-md:px-2 max-md:py-1 max-md:text-xs ${selectedEdition === edition ? 'border-kurio-goldStrong text-kurio-goldStrong' : 'border-kurio-line text-kurio-cream/70'}`}
                >
                  {edition === 'OPEN' ? 'Aberta' : edition}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:mt-0 max-md:block max-md:rounded-t-3xl max-md:bg-[#21130F] max-md:px-5 max-md:py-4 lg:order-6">
            <div className="flex items-center gap-3 max-md:gap-2" aria-label="Quantidade">
              <span className="hidden max-md:mr-auto max-md:inline max-md:font-mono max-md:text-sm">Qtd.</span>
              <button type="button" aria-label="Diminuir quantidade" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1} className="h-10 w-10 rounded-full bg-kurio-goldStrong text-xl text-kurio-ink disabled:opacity-40 max-md:h-7 max-md:w-7">−</button>
              <span className="min-w-5 text-center" aria-live="polite">{quantity}</span>
              <button type="button" aria-label="Aumentar quantidade" onClick={() => setQuantity((value) => Math.min(nft.editionsAvailable, value + 1))} disabled={quantity >= nft.editionsAvailable} className="h-10 w-10 rounded-full bg-kurio-goldStrong text-xl text-kurio-ink disabled:opacity-40 max-md:h-7 max-md:w-7">+</button>
              <span className="text-xs text-kurio-cream/55 max-md:hidden">{nft.editionsAvailable} disponíveis</span>
              <span className="ml-auto hidden font-mono font-bold text-kurio-goldStrong max-md:inline max-md:text-sm">{nft.price} ETH</span>
            </div>
            <div className="flex gap-2 max-md:mt-3">
              <button type="button" onClick={() => void handleBuy()} disabled={addToCart.isPending} className="min-w-36 rounded-md bg-kurio-goldStrong px-7 py-3 text-center font-semibold text-kurio-ink hover:bg-kurio-gold disabled:opacity-70 max-md:flex-1 max-md:rounded-full max-md:px-4">{addToCart.isPending ? 'Adicionando...' : 'Comprar NFT'}</button>
              <FavoriteControl
                nftId={nft.id}
                name={nft.name}
                isAuthenticated={isAuthenticated}
                isFavorite={isFavorite}
                pending={favoritesQuery.isLoading || toggleFavorite.isPending}
                onClick={() => void handleFavorite()}
                showLabel
                className="flex h-12 w-12 items-center justify-center gap-2 rounded-full border border-kurio-gold px-3 text-kurio-goldStrong md:w-auto md:rounded-md"
              />
            </div>
          </div>
          {cartError && <p role="alert" className="mt-2 text-sm text-red-300">{cartError}</p>}
          {favoriteError && <p role="alert" className="mt-2 text-sm text-red-300">{favoriteError}</p>}
          {favoriteFeedback && <p role="status" className="mt-2 text-sm text-kurio-goldStrong">{favoriteFeedback}</p>}

          <div className="mt-2 max-md:mt-3 lg:order-7 lg:flex lg:flex-1 lg:flex-col">
            <dl className="font-mono text-xs text-kurio-gold/90 max-md:text-sm max-md:leading-6">
              <div><dt className="sr-only">ID do token</dt><dd>ID do token: {nft.tokenId}</dd></div>
            </dl>
            <p className="mt-1 font-mono text-xs text-kurio-gold/90 max-md:text-sm max-md:leading-6">Coleção: {nft.collection}</p>
            <div className="mt-1 max-md:hidden">
              <p className="mb-2 text-xs text-kurio-cream/70">Atributos:</p>
              <div className="flex flex-wrap gap-2">
                {nft.attributes.map((attribute) => <span key={attribute} className="rounded border border-kurio-line px-2 py-1 text-[11px]">{attribute}</span>)}
              </div>
            </div>
            <p className="mt-2 hidden font-mono text-xs text-kurio-gold/90 max-md:block max-md:text-sm max-md:leading-6">Atributos: {nft.attributes.join(', ')}</p>
            <div className="mt-3 hidden items-center gap-3 text-xs md:flex lg:mt-auto">
              <span className="font-semibold">Compartilhar este NFT:</span>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noreferrer" aria-label="in — Compartilhar no LinkedIn" className="text-sm font-bold text-kurio-cream hover:text-kurio-goldStrong">in</a>
              <a href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`} aria-label="Compartilhar por e-mail" className="text-kurio-cream hover:text-kurio-goldStrong">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m4 7 8 6 8-6" /></svg>
              </a>
              <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`} target="_blank" rel="noreferrer" aria-label="𝕏 — Compartilhar no X" className="text-sm font-bold text-kurio-cream hover:text-kurio-goldStrong">𝕏</a>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-14 max-md:hidden">
        <div className="flex gap-6 border-b border-kurio-line" role="tablist" aria-label="Informações do NFT">
          <button type="button" role="tab" aria-selected={activeTab === 'details'} onClick={() => setActiveTab('details')} className={`border-b-2 pb-3 ${activeTab === 'details' ? 'border-kurio-goldStrong text-kurio-goldStrong' : 'border-transparent'}`}>Detalhes do NFT</button>
          <button type="button" role="tab" aria-selected={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} className={`border-b-2 pb-3 ${activeTab === 'reviews' ? 'border-kurio-goldStrong text-kurio-goldStrong' : 'border-transparent'}`}>Avaliações ({nft.reviews})</button>
        </div>
        <div role="tabpanel" className="max-w-4xl py-6 leading-7 text-kurio-cream/70">
          {activeTab === 'details' ? (
            <>
              <p>{nft.description}</p>
              <p className="mt-4">A propriedade inclui a arte digital e um registro de procedência associado ao token. Os dados e a disponibilidade são apresentados pela API simulada do marketplace.</p>
              <p className="mt-4">Rede: {nft.network}. Coleção: {nft.collection}. Edição: {nft.edition}.</p>
              <p className="mt-2">Contrato: {nft.contractAddress}. Direitos autorais do criador: {nft.creatorRoyalty}.</p>
            </>
          ) : <p>{nft.rating} de 5 com base em {nft.reviews} avaliações de colecionadores.</p>}
        </div>
      </section>

      <section className="mt-12 hidden md:block">
        <h2 className="border-b border-kurio-line pb-3 text-base font-semibold text-kurio-goldStrong">Mais desta coleção</h2>
        <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {collectionItems.map((item) => (
            <Link key={item.id} to="/market/nfts/$nftId" params={{ nftId: item.id }} className="min-w-0 bg-kurio-surface p-2 transition-colors hover:bg-kurio-gold/10">
              <img src={item.image} alt={item.name} className="aspect-square w-full rounded-md object-cover" />
              <p className="mt-3 truncate text-xs">{item.name}</p>
              <p className="mt-1 text-sm font-bold text-kurio-goldStrong">{item.price} ETH</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function FavoriteControl({ nftId, name, isAuthenticated, isFavorite, pending, onClick, showLabel = false, className }: {
  nftId: string
  name: string
  isAuthenticated: boolean
  isFavorite: boolean
  pending: boolean
  onClick: () => void
  showLabel?: boolean
  className: string
}) {
  const icon = <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7"><path d="M20.8 8.8c0 5.2-8.8 10-8.8 10s-8.8-4.8-8.8-10a4.5 4.5 0 0 1 8.8-1.4 4.5 4.5 0 0 1 8.8 1.4Z" /></svg>
  const label = isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
  if (!isAuthenticated) {
    return (
      <Link to="/login" search={{ returnTo: `/market/nfts/${nftId}` }} aria-label={`Entrar para favoritar ${name}`} className={className}>
        {icon}
        {showLabel && <span className="hidden md:inline">Favoritar</span>}
      </Link>
    )
  }
  return (
    <button type="button" aria-label={`${label}: ${name}`} aria-pressed={isFavorite} disabled={pending} onClick={onClick} className={`${className} disabled:opacity-60`}>
      {icon}
      {showLabel && <span className="hidden md:inline">{isFavorite ? 'Favoritado' : 'Favoritar'}</span>}
    </button>
  )
}

function NftDetailsSkeleton() {
  return (
    <div role="status" aria-label="Carregando detalhes do NFT" className="mx-auto max-w-7xl px-5 py-10">
      <div aria-hidden="true" className="skeleton-shimmer mb-6 h-4 w-48 rounded" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div aria-hidden="true" className="skeleton-shimmer aspect-square rounded-lg" />
        <div aria-hidden="true" className="space-y-5">
          <div className="skeleton-shimmer h-8 w-3/4 rounded" />
          <div className="skeleton-shimmer h-6 w-1/3 rounded" />
          <div className="skeleton-shimmer h-24 rounded" />
          <div className="skeleton-shimmer h-12 w-full rounded" />
        </div>
      </div>
    </div>
  )
}
