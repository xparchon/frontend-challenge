import { useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/features/auth/useAuth'
import { useRealtimeUpdates } from '@/features/realtime/useRealtimeUpdates'
import {
  useCart,
  useConnectWallet,
  useCreateOrder,
  useDisconnectWallet,
  useOrder,
  useProfile,
  useRemoveCartItem,
  useUpdateCartItem,
  useUpdateCoupon,
  useWalletBalance,
  useWallets,
} from '@/features/account/useAccountData'
import { readStoredSession } from '@/lib/auth/sessionStorage'
import { nfts } from '@/mocks/fixtures/nfts'
import type { Cart } from '@/types/cart'

const fieldClass = 'mt-1 h-10 w-full rounded-sm border border-kurio-line bg-transparent px-3 text-sm text-kurio-cream outline-none focus:border-kurio-goldStrong'
const labelClass = 'block text-xs text-kurio-cream/80'
const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-md bg-kurio-goldStrong px-5 font-semibold text-kurio-ink hover:bg-kurio-gold disabled:cursor-not-allowed disabled:opacity-60'
const marketSearch = { search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 } as const

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string') return message
  }
  return fallback
}

function formatEth(value: string) {
  const [whole = '0', fraction = ''] = value.split('.')
  const roundedFraction = fraction.slice(0, 6).replace(/0+$/, '')
  return roundedFraction ? `${whole}.${roundedFraction}` : whole
}

function multiplyEth(value: string, quantity: number) {
  const [whole = '0', fraction = ''] = value.split('.')
  const wei = BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0').slice(0, 18))
  const total = wei * BigInt(quantity)
  const wholeTotal = total / (10n ** 18n)
  const fractionTotal = (total % (10n ** 18n)).toString().padStart(18, '0').replace(/0+$/, '')
  return fractionTotal ? `${wholeTotal}.${fractionTotal}` : wholeTotal.toString()
}

function toWei(value: string) {
  const [whole = '0', fraction = ''] = value.split('.')
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0').slice(0, 18))
}

function fromWei(value: bigint) {
  const whole = value / 10n ** 18n
  const fraction = (value % (10n ** 18n)).toString().padStart(18, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

function getNetworkCart(cart: Cart, network: Cart['items'][number]['network'] | undefined): Cart {
  const items = network ? cart.items.filter((item) => item.network === network) : cart.items
  const subtotal = items.reduce((total, item) => total + toWei(item.unitPrice) * BigInt(item.quantity), 0n)
  const discount = cart.couponCode === 'KURIO10' ? subtotal / 10n : 0n
  const networkFee = items.length ? toWei('0.016') : 0n
  return {
    ...cart,
    items,
    subtotal: fromWei(subtotal),
    discount: fromWei(discount),
    networkFee: fromWei(networkFee),
    estimatedFee: fromWei(networkFee),
    total: fromWei(subtotal - discount + networkFee),
  }
}

function BackLink() {
  return (
    <Link to="/market" search={marketSearch} aria-label="Voltar" className="grid h-9 w-9 place-items-center rounded-full border border-kurio-line text-kurio-goldStrong hover:bg-kurio-surface">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m15 18-6-6 6-6" /></svg>
    </Link>
  )
}

function PageBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Trilha de navegação" className="mb-8 hidden text-xs text-kurio-cream/65 md:block">
      <Link to="/" search={marketSearch} className="hover:text-kurio-goldStrong">Início</Link>
      <span className="mx-2">/</span>
      <Link to="/market" search={marketSearch} className="hover:text-kurio-goldStrong">Mercado</Link>
      <span className="mx-2">/</span>
      <span className="text-kurio-cream">{current}</span>
    </nav>
  )
}

function CartItemRow({
  item,
  updateQuantity,
  removeItem,
  busy,
}: {
  item: Cart['items'][number]
  updateQuantity: (quantity: number) => void
  removeItem: () => void
  busy: boolean
}) {
  return (
    <article className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 bg-kurio-surface px-3 py-2 md:grid-cols-[56px_minmax(0,1.4fr)_100px_120px_100px_28px] md:gap-4">
      <img src={item.image} alt={item.name} className="h-14 w-14 rounded-md object-cover" />
      <div className="min-w-0">
        <Link to="/market/nfts/$nftId" params={{ nftId: item.nftId }} className="truncate text-sm font-semibold hover:text-kurio-goldStrong">{item.name}</Link>
        <p className="mt-1 text-[11px] text-kurio-gold/75">ID do token: {item.tokenId}</p>
        <p className="mt-1 text-[11px] text-kurio-cream/60 md:hidden">{formatEth(item.unitPrice)} ETH · {item.quantity} edições</p>
      </div>
      <p className="hidden text-sm text-kurio-cream/80 md:block">{formatEth(item.unitPrice)} ETH</p>
      <div className="hidden items-center gap-2 md:flex" aria-label={`${item.quantity} edições`}>
        <button type="button" disabled={busy || item.quantity <= 1} aria-label={`Diminuir quantidade de ${item.name}`} onClick={() => updateQuantity(item.quantity - 1)} className="h-7 w-7 rounded-full bg-kurio-goldStrong text-kurio-ink disabled:opacity-40">−</button>
        <span aria-live="polite">{item.quantity}</span>
        <button type="button" disabled={busy} aria-label={`Aumentar quantidade de ${item.name}`} onClick={() => updateQuantity(item.quantity + 1)} className="h-7 w-7 rounded-full bg-kurio-goldStrong text-kurio-ink disabled:opacity-40">+</button>
      </div>
      <p className="text-sm font-bold text-kurio-goldStrong">{formatEth(multiplyEth(item.unitPrice, item.quantity))} ETH</p>
      <button type="button" disabled={busy} aria-label={`Remover ${item.name}`} onClick={removeItem} className="hidden text-lg text-kurio-goldStrong disabled:opacity-40 md:block">⌫</button>
      <div className="col-span-3 flex items-center justify-end gap-3 md:hidden">
        <button type="button" disabled={busy || item.quantity <= 1} aria-label={`Diminuir quantidade de ${item.name}`} onClick={() => updateQuantity(item.quantity - 1)} className="h-7 w-7 rounded-full bg-kurio-goldStrong text-kurio-ink disabled:opacity-40">−</button>
        <span aria-live="polite">{item.quantity}</span>
        <button type="button" disabled={busy} aria-label={`Aumentar quantidade de ${item.name}`} onClick={() => updateQuantity(item.quantity + 1)} className="h-7 w-7 rounded-full bg-kurio-goldStrong text-kurio-ink disabled:opacity-40">+</button>
        <button type="button" disabled={busy} onClick={removeItem} className="ml-2 text-xs text-kurio-goldStrong">Remover</button>
      </div>
    </article>
  )
}

function CartSummary({ cart }: { cart: Cart }) {
  return (
    <dl className="mt-5 space-y-3 text-sm">
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatEth(cart.subtotal)} ETH</dd></div>
      <div className="flex justify-between text-kurio-cream/70"><dt>Desconto{cart.couponCode ? ` (${cart.couponCode})` : ''}</dt><dd>(−) {formatEth(cart.discount)} ETH</dd></div>
      <div className="flex justify-between"><dt>Taxa de rede</dt><dd>{formatEth(cart.networkFee)} ETH</dd></div>
      <p className="text-right text-[10px] text-kurio-goldStrong">Taxa estimada</p>
      <div className="flex justify-between border-t border-kurio-line pt-3 font-semibold"><dt>Total</dt><dd className="text-kurio-goldStrong">{formatEth(cart.total)} ETH</dd></div>
    </dl>
  )
}

function CartSkeleton() {
  return (
    <div role="status" aria-label="Carregando carrinho" className="layout-container min-h-[70vh] pb-10 pt-5 md:pt-8">
      <span className="sr-only">Carregando itens e resumo do carrinho</span>
      <div aria-hidden="true" className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(270px,0.9fr)]">
        <section className="space-y-3">
          <div className="skeleton-shimmer h-5 w-32 rounded" />
          {Array.from({ length: 2 }, (_, index) => <div key={index} className="skeleton-shimmer h-20 rounded-sm" />)}
        </section>
        <aside className="rounded-sm border border-kurio-line p-4">
          <div className="skeleton-shimmer h-5 w-36 rounded" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton-shimmer h-4 rounded" />)}
          </div>
          <div className="skeleton-shimmer mt-6 h-11 w-full rounded-md" />
        </aside>
      </div>
    </div>
  )
}

export function CartPage() {
  const cartQuery = useCart()
  const { session, isSessionLoading } = useAuth()
  const { nftUpdates } = useRealtimeUpdates()
  const updateMutation = useUpdateCartItem()
  const removeMutation = useRemoveCartItem()
  const couponMutation = useUpdateCoupon()
  const [couponCode, setCouponCode] = useState('')
  const [error, setError] = useState('')

  const cart = cartQuery.data
  const updatedCartItems = cart?.items.filter((item) => {
    const update = nftUpdates[item.nftId]
    return update &&
      update.version >= item.version &&
      (update.previous.price !== update.nft.price ||
        update.previous.editionsAvailable !== update.nft.editionsAvailable)
  }) ?? []
  const isAuthenticated = Boolean(session || (isSessionLoading && readStoredSession()))
  const isUpdating = updateMutation.isPending || removeMutation.isPending
  const handleCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    try {
      await couponMutation.mutateAsync(couponCode)
      setCouponCode('')
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, 'Não foi possível aplicar o cupom.'))
    }
  }

  if (cartQuery.isLoading) return <CartSkeleton />
  if (cartQuery.isError || !cart) {
    return <div className="layout-container min-h-[70vh] py-12"><p role="alert">{getErrorMessage(cartQuery.error, 'Não foi possível carregar o carrinho.')}</p><button onClick={() => void cartQuery.refetch()} className="mt-4 underline">Tentar novamente</button></div>
  }

  return (
    <div className="layout-container min-h-[70vh] pb-10 pt-5 md:pt-8">
      <div className="mb-5 flex items-center gap-3 md:hidden"><BackLink /><h1 className="text-sm font-semibold">Carrinho</h1></div>
      <PageBreadcrumb current="Carrinho" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(270px,0.9fr)]">
        <section>
          {updatedCartItems.length > 0 && (
            <p role="status" aria-live="polite" className="mb-3 rounded-sm border border-kurio-gold/50 bg-kurio-surface px-3 py-2 text-xs text-kurio-goldStrong">
              O preço ou a disponibilidade de {updatedCartItems.map((item) => item.name).join(', ')} mudou. O carrinho foi atualizado; revise a cotação antes de prosseguir.
            </p>
          )}
          <div className="mb-3 hidden grid-cols-[56px_minmax(0,1.4fr)_100px_120px_100px_28px] gap-4 border-b border-kurio-line pb-3 text-xs font-semibold md:grid">
            <span className="col-span-2">NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span />
          </div>
          {cart.items.length ? (
            <div className="space-y-3">
              {cart.items.map((item) => (
                <CartItemRow
                  key={`${item.nftId}:${item.edition}`}
                  item={item}
                  busy={isUpdating}
                  updateQuantity={(quantity) => {
                    setError('')
                    updateMutation.mutate({ nftId: item.nftId, edition: item.edition, quantity }, {
                      onError: (mutationError) => setError(getErrorMessage(mutationError, 'Não foi possível atualizar a quantidade.')),
                    })
                  }}
                  removeItem={() => {
                    setError('')
                    removeMutation.mutate({ nftId: item.nftId, edition: item.edition }, {
                      onError: (mutationError) => setError(getErrorMessage(mutationError, 'Não foi possível remover este item.')),
                    })
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="bg-kurio-surface px-5 py-10 text-center">
              <h2 className="font-semibold">Seu carrinho está vazio</h2>
              <p className="mt-2 text-sm text-kurio-cream/65">Adicione um NFT para continuar.</p>
              <Link to="/market" search={marketSearch} className={`${primaryButtonClass} mt-5`}>Explorar NFTs</Link>
            </div>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
          {cartQuery.isFetching && !cartQuery.isLoading && <p role="status" className="mt-3 text-xs text-kurio-cream/50">Atualizando cotação...</p>}
        </section>
        <aside className="h-fit border-t border-kurio-line pt-4 lg:border-0 lg:pt-0">
          <h2 className="border-b border-kurio-line pb-3 text-base font-semibold">Resumo da carteira</h2>
          <form onSubmit={handleCoupon}>
            <label className={`${labelClass} mt-5`} htmlFor="promo-code">Código promocional</label>
            <div className="mt-1 flex">
              <input id="promo-code" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} className={`${fieldClass} mt-0 min-w-0`} placeholder="Digite o código promocional..." />
              <button type="submit" disabled={couponMutation.isPending} className="rounded-r-md bg-kurio-goldStrong px-4 text-xs font-semibold text-kurio-ink disabled:opacity-75">{couponMutation.isPending ? 'Aplicando...' : 'Aplicar'}</button>
            </div>
          </form>
          <CartSummary cart={cart} />
          <Link to="/checkout" className={`${primaryButtonClass} mt-5 w-full ${cart.items.length ? '' : 'pointer-events-none opacity-50'}`} aria-disabled={!cart.items.length}>{isAuthenticated ? 'Seguir para o pagamento' : 'Entrar e finalizar'}</Link>
          <Link to="/market" search={marketSearch} className="mt-4 block text-center text-sm text-kurio-goldStrong hover:underline">Continuar explorando</Link>
        </aside>
      </div>
      <section className="mt-16 hidden md:block">
        <h2 className="mb-5 font-semibold text-kurio-goldStrong">Colecionadores também viram</h2>
        <div className="grid grid-cols-5 gap-5">
          {nfts.slice(1, 6).map((nft) => (
            <Link key={nft.id} to="/market/nfts/$nftId" params={{ nftId: nft.id }} className="bg-kurio-surface p-2">
              <img src={nft.image} alt={nft.name} className="aspect-square w-full rounded-lg object-cover" />
              <p className="mt-2 text-xs">{nft.name}</p><p className="mt-1 text-xs font-bold text-kurio-goldStrong">{nft.price} ETH</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function createAttemptKey() {
  const savedKey = sessionStorage.getItem('kurio.checkout.idempotency')
  if (savedKey) return savedKey
  const newKey = crypto.randomUUID()
  sessionStorage.setItem('kurio.checkout.idempotency', newKey)
  return newKey
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const cartQuery = useCart()
  const { nftUpdates } = useRealtimeUpdates()
  const profileQuery = useProfile()
  const walletsQuery = useWallets()
  const connectWallet = useConnectWallet()
  const disconnectWallet = useDisconnectWallet()
  const createOrder = useCreateOrder()
  const [selectedWalletId, setSelectedWalletId] = useState('')
  const [connectedWalletId, setConnectedWalletId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const cart = cartQuery.data
  const profile = profileQuery.data
  const wallets = walletsQuery.data ?? []
  const networks = [...new Set(cart?.items.map((item) => item.network) ?? [])]
  const matchingWallets = wallets.filter((wallet) => cart?.items.some((item) => item.network === wallet.network))
  const selectedWallet = matchingWallets.find((wallet) => wallet.id === selectedWalletId)
    ?? matchingWallets.find((wallet) => wallet.isPrimary)
    ?? matchingWallets[0]
  const activeWalletId = selectedWallet?.id ?? ''
  const walletBalanceQuery = useWalletBalance(activeWalletId)
  const activeNetwork = selectedWallet?.network ?? networks[0]
  const checkoutCart = cart ? getNetworkCart(cart, activeNetwork) : undefined
  const updatedCartItems = cart?.items.filter((item) => {
    const update = nftUpdates[item.nftId]
    return update &&
      update.version >= item.version &&
      (update.previous.price !== update.nft.price ||
        update.previous.editionsAvailable !== update.nft.editionsAvailable)
  }) ?? []
  const networkMatches = Boolean(selectedWallet && checkoutCart?.items.length && checkoutCart.items.every((item) => item.network === selectedWallet.network))
  const hasEnoughBalance = Boolean(walletBalanceQuery.data && checkoutCart && toWei(walletBalanceQuery.data.amount) >= toWei(checkoutCart.total))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!cart?.items.length) {
      setError('Seu carrinho está vazio.')
      return
    }
    if (cartQuery.isFetching) {
      setError('A cotação está sendo atualizada. Aguarde e revise o total antes de confirmar.')
      return
    }
    if (!checkoutCart?.items.length) {
      setError('Não há itens disponíveis para a rede selecionada.')
      return
    }
    if (!selectedWallet || connectedWalletId !== selectedWallet.id) {
      setError('Conecte uma carteira cadastrada antes de confirmar.')
      return
    }
    if (!walletBalanceQuery.data || !checkoutCart || toWei(walletBalanceQuery.data.amount) < toWei(checkoutCart.total)) {
      setError('Saldo insuficiente para concluir esta compra.')
      return
    }

    try {
      const order = await createOrder.mutateAsync({
        walletId: selectedWallet.id,
        quoteVersion: cart.quoteVersion,
        idempotencyKey: createAttemptKey(),
        items: checkoutCart.items.map(({ nftId, edition, quantity }) => ({ nftId, edition, quantity })),
      })
      sessionStorage.removeItem('kurio.checkout.idempotency')
      const userId = readStoredSession()?.user.id
      queryClient.setQueryData(['private', userId, 'orders', order.id], order)
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      await navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    } catch (mutationError) {
      if (axios.isAxiosError(mutationError) && mutationError.response?.status === 409) {
        sessionStorage.removeItem('kurio.checkout.idempotency')
      }
      setError(getErrorMessage(mutationError, 'Não foi possível criar o pedido. A tentativa pode ser retomada sem duplicar a compra.'))
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
    }
  }

  if (cartQuery.isLoading || profileQuery.isLoading || walletsQuery.isLoading || walletBalanceQuery.isLoading) {
    return <div className="layout-container min-h-[70vh] py-12" role="status">Preparando pagamento...</div>
  }
  if (cartQuery.isError || profileQuery.isError || walletsQuery.isError || walletBalanceQuery.isError || !cart || !profile) {
    return <div className="layout-container min-h-[70vh] py-12"><p role="alert">Não foi possível preparar o pagamento. Verifique sua sessão, perfil e carteiras.</p></div>
  }
  if (!cart.items.length) {
    return <div className="layout-container min-h-[70vh] py-12"><p>Seu carrinho está vazio.</p><Link to="/cart" className="mt-3 inline-block text-kurio-goldStrong underline">Voltar ao carrinho</Link></div>
  }

  return (
    <div className="layout-container min-h-[70vh] pb-[106px] pt-5 md:pb-16 md:pt-8">
      <div className="mb-5 flex items-center gap-3 md:hidden"><BackLink /><h1 className="text-sm font-semibold">Pagamento com carteira</h1></div>
      <PageBreadcrumb current="Pagamento" />
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)]">
          <section>
            <h1 className="mb-4 text-lg font-semibold">Perfil do colecionador</h1>
            {updatedCartItems.length > 0 && (
              <p role="status" aria-live="polite" className="mb-4 rounded-sm border border-kurio-gold/50 bg-kurio-surface px-3 py-2 text-xs text-kurio-goldStrong">
                O preço ou a disponibilidade de {updatedCartItems.map((item) => item.name).join(', ')} mudou. A cotação foi sincronizada; revise o total antes de confirmar.
              </p>
            )}
            <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
              <label className={labelClass}>Nome de exibição<input required readOnly value={profile.displayName} className={fieldClass} /></label>
              <label className={labelClass}>Nome de usuário<input required readOnly value={profile.username} className={fieldClass} /></label>
              <label className={labelClass}>E-mail<input required type="email" readOnly value={profile.email} className={fieldClass} /></label>
              <label className={labelClass}>Nome ENS<input readOnly value={profile.ensName} className={fieldClass} placeholder="Não informado" /></label>
            </div>
            {networks.length > 1 && <p className="mt-4 text-xs text-kurio-gold/80">Cada rede é confirmada em uma transação separada. Depois do pagamento, você poderá continuar com os itens restantes.</p>}
            <fieldset className="mt-7">
              <legend className="mb-3 text-sm font-semibold">Carteira conectada</legend>
              {matchingWallets.length ? (
                <div className="space-y-2">
                  {matchingWallets.map((wallet) => (
                    <label key={wallet.id} className="flex cursor-pointer items-start gap-3 rounded-sm border border-kurio-line px-3 py-3 text-sm has-[:checked]:border-kurio-goldStrong">
                      <input type="radio" name="wallet" value={wallet.id} checked={activeWalletId === wallet.id} onChange={() => {
                        if (connectedWalletId) {
                          void disconnectWallet.mutateAsync(connectedWalletId).catch((disconnectError) => {
                            setError(getErrorMessage(disconnectError, 'Não foi possível desconectar a carteira.'))
                          })
                        }
                        setSelectedWalletId(wallet.id)
                        setConnectedWalletId('')
                        setMessage('')
                      }} className="mt-1 accent-kurio-goldStrong" />
                      <span className="min-w-0 flex-1"><strong>{wallet.label}</strong><span className="mt-1 block break-all text-xs text-kurio-cream/65">{wallet.address}</span><span className="mt-1 block text-xs text-kurio-gold/75">{wallet.network} · {wallet.type}</span></span>
                      {wallet.isPrimary && <span className="text-[10px] text-kurio-goldStrong">Principal</span>}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="rounded-sm border border-kurio-line p-4 text-sm">
                  <p>{wallets.length ? `Adicione uma carteira na rede ${activeNetwork ?? 'dos NFTs'} para continuar.` : 'Adicione uma carteira antes de continuar.'}</p>
                  <Link to="/wallets" search={{ returnTo: '/checkout' }} className="mt-2 inline-block text-kurio-goldStrong underline">Gerenciar carteiras</Link>
                </div>
              )}
              {selectedWallet && walletBalanceQuery.data && (
                <p className="mt-3 rounded-sm bg-kurio-surface px-3 py-2 text-xs text-kurio-cream/80">
                  Saldo simulado disponível: <strong className="text-kurio-goldStrong">{formatEth(walletBalanceQuery.data.amount)} ETH</strong>
                </p>
              )}
              {selectedWallet && checkoutCart && walletBalanceQuery.data && !hasEnoughBalance && (
                <p role="alert" className="mt-2 text-xs text-red-300">
                  Saldo insuficiente. Esta compra precisa de {formatEth(checkoutCart.total)} ETH.
                </p>
              )}
              {selectedWallet && (
                <button type="button" disabled={connectWallet.isPending || disconnectWallet.isPending} onClick={async () => {
                  setError('')
                  if (connectedWalletId === selectedWallet.id) {
                    try {
                      await disconnectWallet.mutateAsync(selectedWallet.id)
                      setConnectedWalletId('')
                      setMessage('Carteira desconectada.')
                    } catch (connectionError) {
                      setError(getErrorMessage(connectionError, 'Não foi possível desconectar a carteira.'))
                    }
                    return
                  }
                  try {
                    await connectWallet.mutateAsync(selectedWallet.id)
                    setConnectedWalletId(selectedWallet.id)
                    setMessage(`Conexão simulada com ${selectedWallet.type} (${selectedWallet.network}).`)
                  } catch (connectionError) {
                    setConnectedWalletId('')
                    setError(getErrorMessage(connectionError, 'A conexão da carteira foi recusada.'))
                  }
                }} className="mt-3 rounded-md border border-kurio-gold px-4 py-2 text-xs text-kurio-goldStrong disabled:opacity-60">
                  {connectedWalletId === selectedWallet.id ? 'Desconectar carteira' : connectWallet.isPending ? 'Conectando...' : 'Conectar carteira'}
                </button>
              )}
              {selectedWallet && !networkMatches && <p role="alert" className="mt-2 text-xs text-red-300">A rede da carteira não corresponde aos itens selecionados.</p>}
              {message && <p role="status" className="mt-2 text-xs text-green-300">{message}</p>}
            </fieldset>
          </section>
          <aside className="h-fit">
            <h2 className="mb-3 font-semibold">Seus NFTs{activeNetwork ? ` · ${activeNetwork}` : ''}</h2>
            {(checkoutCart?.items ?? []).map((item) => (
              <div key={`${item.nftId}:${item.edition}`} className="mb-2 flex items-center gap-2 bg-kurio-surface p-2">
                <img src={item.image} alt="" className="h-12 w-12 rounded object-cover" />
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.name}</p><p className="text-[10px] text-kurio-gold/70">ID do token: {item.tokenId} · {item.edition} (x {item.quantity})</p></div>
                <p className="text-xs font-bold text-kurio-goldStrong">{formatEth(multiplyEth(item.unitPrice, item.quantity))} ETH</p>
              </div>
            ))}
            {checkoutCart && <CartSummary cart={checkoutCart} />}
            {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={!checkoutCart?.items.length || cartQuery.isFetching || !selectedWallet || !networkMatches || !hasEnoughBalance || connectedWalletId !== selectedWallet.id || createOrder.isPending} className={`${primaryButtonClass} mt-5 w-full max-md:fixed max-md:inset-x-[22px] max-md:bottom-6 max-md:z-20 max-md:w-[calc(100%-44px)] max-md:rounded-full`}>
              {createOrder.isPending ? 'Confirmando...' : cartQuery.isFetching ? 'Atualizando cotação...' : 'Confirmar compra'}
            </button>
            <Link to="/cart" className="mt-3 block text-center text-xs text-kurio-goldStrong underline">Revisar carrinho e cotação</Link>
          </aside>
        </div>
      </form>
    </div>
  )
}

export function OrderConfirmationPage({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient()
  const orderQuery = useOrder(orderId)
  const cartQuery = useCart()
  const order = orderQuery.data
  useEffect(() => {
    if (order?.status === 'confirmed') void queryClient.invalidateQueries({ queryKey: ['cart'] })
  }, [order?.status, queryClient])

  if (orderQuery.isLoading) return <div className="grid min-h-screen place-items-center" role="status">Carregando pedido...</div>
  if (orderQuery.isError || !order) {
    return <div className="grid min-h-[70vh] place-items-center px-5"><div><p role="alert">{getErrorMessage(orderQuery.error, 'Pedido não encontrado.')}</p><Link to="/market" search={marketSearch} className="mt-4 inline-block text-kurio-goldStrong underline">Voltar ao marketplace</Link></div></div>
  }

  const confirmed = order.status === 'confirmed'
  const rejected = order.status === 'rejected'
  const canContinuePurchase = Boolean(cartQuery.data?.items.length && !cartQuery.isFetching && (confirmed || rejected))
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-8">
      <article className="w-full max-w-[560px] border-b-[6px] border-kurio-goldStrong bg-kurio-surface">
        <header className="border-b border-kurio-line px-5 py-5 text-center">
          <div aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center text-4xl text-kurio-goldStrong">{confirmed ? '✓' : rejected ? '!' : '…'}</div>
          <h1 className="mt-3 font-semibold">{confirmed ? 'Compra confirmada' : rejected ? 'Pagamento recusado' : 'Pedido em processamento'}</h1>
          <p role="status" className="mt-1 text-xs text-kurio-gold/80">
            {confirmed ? 'O pedido foi confirmado na simulação.' : rejected ? 'A transação simulada foi recusada. Os itens continuam no carrinho.' : 'Aguardando confirmação simulada da transação.'}
          </p>
        </header>
        <div className="grid grid-cols-2 gap-3 border-b border-kurio-line px-5 py-3 text-[11px] sm:grid-cols-4">
          <p><span className="block text-kurio-gold/70">Pedido</span>{order.id}</p>
          <p><span className="block text-kurio-gold/70">Data</span>{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
          <p><span className="block text-kurio-gold/70">Total</span>{formatEth(order.receipt.total)} ETH</p>
          <p><span className="block text-kurio-gold/70">Rede</span>{order.walletNetwork}</p>
        </div>
        <section className="px-5 py-5">
          <h2 className="mb-3 text-sm font-semibold">Detalhes do pedido</h2>
          {order.receipt.items.map((item) => (
            <div key={`${item.nftId}:${item.edition}`} className="mb-3 flex items-center gap-3">
              <img src={item.image} alt={item.name} className="h-12 w-12 rounded object-cover" />
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.name}</p><p className="text-[10px] text-kurio-gold/70">ID do token: {item.tokenId} · edição {item.edition}</p></div>
              <span className="text-xs text-kurio-gold/75">x {item.quantity}</span>
              <span className="text-xs">{formatEth(item.subtotal)} ETH</span>
            </div>
          ))}
          <div className="mt-4 space-y-2 border-t border-kurio-line pt-3 text-xs">
            <p className="flex justify-between"><span>Subtotal</span><span>{formatEth(order.receipt.subtotal)} ETH</span></p>
            <p className="flex justify-between"><span>Desconto</span><span>− {formatEth(order.receipt.discount)} ETH</span></p>
            <p className="flex justify-between"><span>Taxa de rede</span><span>{formatEth(order.receipt.networkFee)} ETH</span></p>
            <p className="flex justify-between border-t border-kurio-line pt-3 font-semibold"><span>Total</span><span className="text-kurio-goldStrong">{formatEth(order.receipt.total)} ETH</span></p>
          </div>
          <p className="mt-4 break-all text-[10px] text-kurio-cream/55">Carteira: {order.walletAddress}</p>
          <p className="mt-1 break-all text-[10px] text-kurio-cream/55">Referência simulada: {order.transactionReference}</p>
          {canContinuePurchase && (
            <Link to="/checkout" className={`${primaryButtonClass} mx-auto mt-5 flex w-fit`}>
              {rejected ? 'Tentar novamente' : 'Continuar com os itens restantes'}
            </Link>
          )}
          <Link to="/market" search={marketSearch} className={`${primaryButtonClass} mx-auto mt-5 flex w-fit`}>Voltar ao marketplace</Link>
        </section>
      </article>
    </div>
  )
}
