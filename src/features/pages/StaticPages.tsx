import { useEffect, useRef, useState, type FormEvent } from 'react'
import axios from 'axios'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useAuth } from '@/features/auth/useAuth'
import { nfts } from '@/mocks/fixtures/nfts'
import type { ApiErrorResponse } from '@/types/api'

const fieldClass = 'mt-1 h-10 w-full rounded-sm border border-kurio-line bg-transparent px-3 text-sm text-kurio-cream outline-none focus:border-kurio-goldStrong'
const labelClass = 'block text-xs text-kurio-cream/80'
const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-md bg-kurio-goldStrong px-5 font-semibold text-kurio-ink hover:bg-kurio-gold disabled:cursor-not-allowed'
const marketSearch = { search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 } as const

const demoCartItems = [
  { nft: nfts[0], quantity: 2 },
  { nft: nfts[4], quantity: 6 },
  { nft: nfts[6], quantity: 9 },
]

function BackLink({ to = '/market' }: { to?: '/market' | '/cart' }) {
  return (
    <Link to={to} search={marketSearch} aria-label="Voltar" className="grid h-9 w-9 place-items-center rounded-full border border-kurio-line text-kurio-goldStrong hover:bg-kurio-surface">
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

function CartItem({ nft, quantity }: { nft: (typeof nfts)[number]; quantity: number }) {
  const subtotal = (Number(nft.price) * quantity).toFixed(2)
  return (
    <article className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 bg-kurio-surface px-3 py-2 md:grid-cols-[56px_minmax(0,1.4fr)_100px_120px_100px_28px] md:gap-4">
      <img src={nft.image} alt={nft.name} className="h-14 w-14 rounded-md object-cover" />
      <div className="min-w-0">
        <Link to="/market/nfts/$nftId" params={{ nftId: nft.id }} className="truncate text-sm font-semibold hover:text-kurio-goldStrong">{nft.name}</Link>
        <p className="mt-1 text-[11px] text-kurio-gold/75">ID do token: {nft.tokenId}</p>
        <p className="mt-1 text-[11px] text-kurio-cream/60 md:hidden">{nft.price} ETH · {quantity} edições</p>
      </div>
      <p className="hidden text-sm text-kurio-cream/80 md:block">{nft.price} ETH</p>
      <div className="hidden items-center gap-2 md:flex" aria-label={`${quantity} edições`}>
        <button type="button" disabled aria-label="Diminuir quantidade" className="h-7 w-7 rounded-full bg-kurio-goldStrong text-kurio-ink disabled:opacity-80">−</button>
        <span>{quantity}</span>
        <button type="button" disabled aria-label="Aumentar quantidade" className="h-7 w-7 rounded-full bg-kurio-goldStrong text-kurio-ink disabled:opacity-80">+</button>
      </div>
      <p className="text-sm font-bold text-kurio-goldStrong">{subtotal} ETH</p>
      <button type="button" disabled aria-label={`Remover ${nft.name}`} className="hidden text-lg text-kurio-goldStrong md:block">⌫</button>
    </article>
  )
}

export function CartPage() {
  return (
    <div className="layout-container min-h-[70vh] pb-10 pt-5 md:pt-8">
      <div className="mb-5 flex items-center gap-3 md:hidden">
        <BackLink />
        <h1 className="text-sm font-semibold">Carrinho</h1>
      </div>
      <PageBreadcrumb current="Carrinho" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(270px,0.9fr)]">
        <section>
          <div className="mb-3 hidden grid-cols-[56px_minmax(0,1.4fr)_100px_120px_100px_28px] gap-4 border-b border-kurio-line pb-3 text-xs font-semibold md:grid">
            <span className="col-span-2">NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span />
          </div>
          <div className="space-y-3">
            {demoCartItems.map(({ nft, quantity }) => <CartItem key={nft.id} nft={nft} quantity={quantity} />)}
          </div>
          <p className="mt-3 text-right text-[10px] text-kurio-cream/50">Prévia visual com itens de demonstração</p>
        </section>
        <aside className="h-fit border-t border-kurio-line pt-4 lg:border-0 lg:pt-0">
          <h2 className="border-b border-kurio-line pb-3 text-base font-semibold">Resumo da carteira</h2>
          <label className={`${labelClass} mt-5`} htmlFor="promo-code">Código promocional</label>
          <div className="mt-1 flex">
            <input id="promo-code" className={`${fieldClass} mt-0 min-w-0`} placeholder="Digite o código promocional..." />
            <button type="button" disabled className="rounded-r-md bg-kurio-goldStrong px-4 text-xs font-semibold text-kurio-ink disabled:opacity-75">Aplicar</button>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>26.83 ETH</dd></div>
            <div className="flex justify-between text-kurio-cream/70"><dt>Desconto do lançamento</dt><dd>(−) 00.00</dd></div>
            <div className="flex justify-between"><dt>Taxa de rede</dt><dd>0.016 ETH</dd></div>
            <p className="text-right text-[10px] text-kurio-goldStrong">Taxa estimada</p>
            <div className="flex justify-between border-t border-kurio-line pt-3 font-semibold"><dt>Total</dt><dd className="text-kurio-goldStrong">26.846 ETH</dd></div>
          </dl>
          <Link to="/checkout" className={`${primaryButtonClass} mt-5 w-full`}>Conectar e finalizar</Link>
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

function CheckoutSummary() {
  return (
    <aside className="h-fit">
      <h2 className="mb-3 font-semibold">Seus NFTs</h2>
      {demoCartItems.map(({ nft, quantity }) => (
        <div key={nft.id} className="mb-2 flex items-center gap-2 bg-kurio-surface p-2">
          <img src={nft.image} alt="" className="h-12 w-12 rounded object-cover" />
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{nft.name}</p><p className="text-[10px] text-kurio-gold/70">ID do token: {nft.tokenId} &nbsp; (x {quantity})</p></div>
          <p className="text-xs font-bold text-kurio-goldStrong">{(Number(nft.price) * quantity).toFixed(2)} ETH</p>
        </div>
      ))}
      <div className="mt-4 space-y-2 border-b border-kurio-line pb-4 text-xs">
        <p className="flex justify-between"><span>Subtotal</span><span>26.83 ETH</span></p>
        <p className="flex justify-between"><span>Desconto do lançamento</span><span>(−) 00.00</span></p>
        <p className="flex justify-between"><span>Taxa de rede</span><span>0.016 ETH</span></p>
      </div>
      <p className="mt-3 flex justify-between font-semibold"><span>Total</span><span className="text-kurio-goldStrong">26.846 ETH</span></p>
    </aside>
  )
}

function ConnectedWallets() {
  return (
    <fieldset className="mt-6">
      <legend className="mb-3 w-full text-center text-sm font-semibold">Carteira e rede</legend>
      <div className="space-y-2">
        {['MetaMask', 'WalletConnect', 'Coinbase Wallet'].map((wallet, index) => (
          <label key={wallet} className="flex cursor-pointer items-center gap-3 rounded-sm border border-kurio-line px-3 py-3 text-sm has-[:checked]:border-kurio-goldStrong">
            <input type="radio" name="wallet" defaultChecked={index === 2} className="accent-kurio-goldStrong" />
            <span>{wallet}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function CheckoutMobile() {
  return (
    <div className="min-h-screen px-[22px] pb-[106px] pt-5 md:hidden">
      <header className="mb-4 flex items-center gap-4">
        <BackLink to="/cart" />
        <h1 className="font-mono text-sm font-semibold">Pagamento com carteira</h1>
      </header>
      <div className="flex items-center justify-between text-xs">
        <h2 className="font-semibold">Carteira conectada</h2>
        <button type="button" disabled className="text-kurio-goldStrong disabled:opacity-80">Trocar carteira</button>
      </div>
      <div className="mt-3 space-y-3">
        <label className="flex items-start gap-3 rounded-xl bg-kurio-surface p-4">
          <input type="radio" name="primary-wallet" defaultChecked className="mt-1 accent-kurio-goldStrong" />
          <span className="min-w-0 flex-1"><strong className="block text-sm">Reserva</strong><span className="mt-1 block text-xs text-kurio-gold/75">nova.kurio.eth</span><span className="mt-1 block text-xs text-kurio-gold/75">Rede Polygon</span></span>
          <span aria-hidden="true" className="text-kurio-gold/70">⋮</span>
        </label>
        <label className="flex items-start gap-3 rounded-xl bg-kurio-surface p-4">
          <input type="radio" name="primary-wallet" className="mt-1 accent-kurio-goldStrong" />
          <span className="min-w-0 flex-1"><strong className="block text-sm">Principal</strong><span className="mt-1 block text-xs text-kurio-gold/75">0xA91F...E82C</span><span className="mt-1 block text-xs text-kurio-gold/75">Rede principal Ethereum</span></span>
          <span aria-hidden="true" className="text-kurio-gold/70">⋮</span>
        </label>
      </div>
      <h2 className="mb-3 mt-4 text-xs font-semibold">Carteira e rede</h2>
      <div className="space-y-3">
        {['WalletConnect', 'MetaMask', 'Coinbase Wallet'].map((wallet, index) => (
          <label key={wallet} className="flex h-[60px] items-center gap-3 rounded-xl bg-kurio-surface px-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-kurio-ink text-xs text-kurio-goldStrong">{wallet[0]}</span>
            <span className="flex-1 text-xs">{wallet}</span>
            <input type="radio" name="payment-wallet" defaultChecked={index === 2} className="accent-kurio-goldStrong" />
          </label>
        ))}
      </div>
      <p className="mt-3 text-right text-sm font-semibold">Total: <span className="ml-2 text-kurio-goldStrong">8.936 ETH</span></p>
      <button type="button" disabled className={`${primaryButtonClass} fixed inset-x-[22px] bottom-6 z-20 w-[calc(100%-44px)] rounded-full disabled:opacity-100`}>Confirmar compra</button>
    </div>
  )
}

export function CheckoutPage() {
  return (
    <>
      <CheckoutMobile />
      <div className="layout-container hidden min-h-[70vh] pb-16 pt-8 md:block">
        <PageBreadcrumb current="Pagamento" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)]">
          <form onSubmit={(event) => event.preventDefault()}>
            <h1 className="mb-4 text-lg font-semibold">Perfil do colecionador</h1>
            <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
              <label className={labelClass}>Nome de exibição<span className="text-kurio-goldStrong">*</span><input required className={fieldClass} /></label>
              <label className={labelClass}>Nome de usuário<span className="text-kurio-goldStrong">*</span><input required className={fieldClass} /></label>
              <label className={labelClass}>Rede<span className="text-kurio-goldStrong">*</span><select required className={fieldClass} defaultValue=""><option value="" disabled>Selecione uma rede</option><option>Ethereum</option><option>Polygon</option><option>Solana</option></select></label>
              <label className={labelClass}>Nome do perfil<span className="text-kurio-goldStrong">*</span><input required className={fieldClass} /></label>
              <label className={labelClass}>Endereço da carteira<span className="text-kurio-goldStrong">*</span><input required className={fieldClass} placeholder="Endereço 0x da carteira" /></label>
              <input aria-label="ENS ou carteira secundária (opcional)" className={`${fieldClass} self-end`} placeholder="ENS ou carteira secundária (opcional)" />
              <label className={labelClass}>Tipo de carteira<span className="text-kurio-goldStrong">*</span><select required className={fieldClass} defaultValue=""><option value="" disabled>Selecione uma carteira</option><option>MetaMask</option><option>WalletConnect</option><option>Coinbase Wallet</option></select></label>
              <label className={labelClass}>Código de indicação<span className="text-kurio-goldStrong">*</span><input required className={fieldClass} /></label>
              <label className={labelClass}>E-mail<span className="text-kurio-goldStrong">*</span><input type="email" required className={fieldClass} /></label>
              <label className={labelClass}>Nome ENS<span className="text-kurio-goldStrong">*</span><div className="flex gap-2"><select className={`${fieldClass} w-20`} aria-label="Sufixo ENS"><option>.eth</option></select><input required className={fieldClass} /></div></label>
            </div>
            <label className="mt-5 flex items-center gap-2 text-xs"><input type="checkbox" className="accent-kurio-goldStrong" />Usar outra carteira?</label>
            <label className={`${labelClass} mt-5 max-w-sm`}>Observação do colecionador (opcional)<textarea className={`${fieldClass} h-28 resize-y py-2`} /></label>
          </form>
          <div>
            <CheckoutSummary />
            <ConnectedWallets />
            <button type="button" disabled className={`${primaryButtonClass} mt-5 w-full`}>Confirmar compra</button>
          </div>
        </div>
      </div>
    </>
  )
}

export function OrderConfirmationPage({ orderId }: { orderId: string }) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <article className="w-full max-w-[500px] border-b-[6px] border-kurio-goldStrong bg-kurio-surface">
        <header className="border-b border-kurio-line px-5 py-5 text-center">
          <div aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center text-4xl text-kurio-goldStrong">✉</div>
          <h1 className="mt-3 font-semibold">Resumo do pedido</h1>
          <p className="mt-1 text-xs text-kurio-gold/80">Prévia da confirmação — nenhuma transação foi realizada.</p>
        </header>
        <div className="grid grid-cols-2 gap-3 border-b border-kurio-line px-5 py-3 text-[11px] sm:grid-cols-4">
          <p><span className="block text-kurio-gold/70">Pedido</span>{orderId}</p>
          <p><span className="block text-kurio-gold/70">Data</span>—</p>
          <p><span className="block text-kurio-gold/70">Total</span>—</p>
          <p><span className="block text-kurio-gold/70">Carteira</span>—</p>
        </div>
        <section className="px-5 py-5">
          <h2 className="mb-3 text-sm font-semibold">Detalhes do pedido</h2>
          {demoCartItems.map(({ nft, quantity }) => (
            <div key={nft.id} className="mb-3 flex items-center gap-3">
              <img src={nft.image} alt={nft.name} className="h-12 w-12 rounded object-cover" />
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{nft.name}</p><p className="text-[10px] text-kurio-gold/70">ID do token: {nft.tokenId}</p></div>
              <span className="text-xs text-kurio-gold/75">(x {quantity})</span>
            </div>
          ))}
          <p className="mt-5 border-t border-kurio-line pt-3 text-center text-xs leading-5 text-kurio-gold/80">A confirmação real e os dados da transação estarão disponíveis após a integração com a carteira e a rede.</p>
          <Link to="/market" search={marketSearch} className={`${primaryButtonClass} mx-auto mt-5 flex w-fit`}>Voltar ao marketplace</Link>
        </section>
      </article>
    </div>
  )
}

export function AuthPage({ mode, returnTo }: { mode: 'login' | 'register'; returnTo?: string }) {
  const isRegister = mode === 'register'
  const navigate = useNavigate()
  const router = useRouter()
  const handleAuthenticated = () => {
    if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) {
      router.history.push(returnTo)
    } else {
      void navigate({ to: '/', search: marketSearch })
    }
  }

  return (
    <>
      <MobileAuthPage mode={mode} onSuccess={handleAuthenticated} />
      <div className="relative hidden min-h-[calc(100vh-70px)] overflow-hidden md:grid md:min-h-[650px] md:place-items-center md:px-6 md:py-12">
        <img src={nfts[0].image} alt="" className="absolute inset-0 hidden h-full w-full object-cover opacity-20 md:block" />
        <div className="absolute inset-0 hidden bg-kurio-ink/75 md:block" />
        <section className="relative mx-auto w-full max-w-[500px] bg-kurio-surface px-6 py-7 md:border-b-[6px] md:border-kurio-goldStrong md:px-10 md:py-8">
          <header className="mb-6 flex items-center justify-between">
            <BackLink />
            <div className="flex gap-2 font-semibold">
              <Link to="/login" className={!isRegister ? 'text-kurio-goldStrong' : 'text-kurio-cream/70'}>Entrar</Link>
              <span>|</span>
              <Link to="/register" className={isRegister ? 'text-kurio-goldStrong' : 'text-kurio-cream/70'}>Criar conta</Link>
            </div>
            <span className="w-9" />
          </header>
          <h1 className="sr-only">{isRegister ? 'Criar conta na Kurio' : 'Entrar na Kurio'}</h1>
          <AuthFormFields mode={mode} showPasswordVisibilityToggle={mode === 'register'} onSuccess={handleAuthenticated} />
        </section>
      </div>
    </>
  )
}

function MobileAuthPage({ mode, onSuccess }: { mode: 'login' | 'register'; onSuccess: () => void }) {
  const isRegister = mode === 'register'
  const [passwordVisible, setPasswordVisible] = useState(false)
  const authForm = useAuthForm(mode, onSuccess)

  return (
    <section className="min-h-screen bg-kurio-ink px-[26px] pt-[120px] md:hidden">
      <Link to="/" search={marketSearch} className="block text-center font-mono text-[28px] font-bold leading-8 tracking-[0.18em] text-kurio-cream">KURIO</Link>
      <h1 className="mt-[84px] text-center font-mono text-lg font-semibold tracking-wide">
        {isRegister ? 'Criar perfil de colecionador' : 'Entrar'}
      </h1>
      <form onSubmit={authForm.handleSubmit} className="mt-[30px] space-y-3">
        {isRegister && <input aria-label="Nome de usuário" name="username" autoComplete="username" minLength={3} required className="h-12 w-full rounded-md border border-kurio-line bg-transparent px-3 text-sm text-kurio-cream outline-none placeholder:text-kurio-gold/70 focus:border-kurio-goldStrong" placeholder="Nome de usuário" />}
        <input aria-label="E-mail" name="email" type="email" autoComplete="email" required className="h-12 w-full rounded-md border border-kurio-line bg-transparent px-3 text-sm text-kurio-cream outline-none placeholder:text-kurio-gold/70 focus:border-kurio-goldStrong" placeholder={isRegister ? 'Digite seu e-mail' : 'contato@email.com'} />
        <div className="relative">
          <input aria-label="Senha" name="password" type={passwordVisible ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 8 : undefined} required className="h-12 w-full rounded-md border border-kurio-line bg-transparent px-3 pr-12 text-sm text-kurio-cream outline-none placeholder:text-kurio-gold/70 focus:border-kurio-goldStrong" placeholder={isRegister ? 'Senha' : '***********'} />
          <PasswordVisibilityButton visible={passwordVisible} onToggle={() => setPasswordVisible((visible) => !visible)} size="mobile" />
        </div>
        {isRegister && (
          <div className="relative">
            <input aria-label="Confirmar senha" name="confirmPassword" type={passwordVisible ? 'text' : 'password'} autoComplete="new-password" minLength={8} required className="h-12 w-full rounded-md border border-kurio-line bg-transparent px-3 text-sm text-kurio-cream outline-none placeholder:text-kurio-gold/70 focus:border-kurio-goldStrong" placeholder="Confirmar senha" />
          </div>
        )}
        {!isRegister && <Link to="/login" className="block text-right text-xs text-kurio-goldStrong">Esqueceu a senha?</Link>}
        <div className="pt-5">
          <button type="submit" disabled={authForm.isSubmitting} className={`${primaryButtonClass} h-14 w-full rounded-sm disabled:opacity-70`}>{authForm.isSubmitting ? 'Aguarde...' : isRegister ? 'Criar perfil' : 'Entrar'}</button>
        </div>
      </form>
      {authForm.error && <p role="alert" className="mt-3 text-center text-xs text-red-300">{authForm.error}</p>}
      <div className="mt-10">
        {isRegister ? (
          <div className="mb-3 flex items-center gap-3 text-center text-[10px] text-kurio-cream/80">
            <span className="h-px flex-1 bg-kurio-line" />Ou continue com<span className="h-px flex-1 bg-kurio-line" />
          </div>
        ) : (
          <p className="mb-3 text-center text-[10px] text-kurio-cream/80">Ou continue com</p>
        )}
        <SocialAuthButtons />
      </div>
      <p className={`text-center text-xs text-kurio-cream/70 ${isRegister ? 'mt-10' : 'mt-9'}`}>
        {isRegister ? 'Já tem uma conta? ' : 'Novo na Kurio? '}
        <Link to={isRegister ? '/login' : '/register'} className="text-kurio-gold/80">
          {isRegister ? 'Entre' : 'Crie uma conta'}
        </Link>
      </p>
    </section>
  )
}

function SocialAuthButtons() {
  return (
    <div className="space-y-3">
      <button type="button" disabled className="flex h-10 w-full items-center justify-center gap-3 rounded-sm border border-kurio-line text-xs text-kurio-cream/80 disabled:opacity-100">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.31v2.77h3.57c2.08-1.92 3.27-4.75 3.27-8.09Z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84A11 11 0 0 0 12 23Z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.15a11 11 0 0 0 0 9.88l3.69-2.84Z" />
          <path fill="#EA4335" d="M12 4.36c1.62 0 3.07.56 4.21 1.67l3.15-3.15C17.45 1.09 14.97 0 12 0A11 11 0 0 0 2.15 7.06l3.69 2.84c.87-2.6 3.3-5.54 6.16-5.54Z" />
        </svg>
        Continuar com Google
      </button>
      <button type="button" disabled className="flex h-10 w-full items-center justify-center gap-3 rounded-sm border border-kurio-line text-xs text-kurio-cream/80 disabled:opacity-100">
        <span aria-hidden="true" className="font-sans text-lg font-bold text-[#1877F2]">f</span>Continuar com Facebook
      </button>
    </div>
  )
}

export function DesktopAuthDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const previouslyFocusedElement = document.activeElement
    dialog.showModal()
    dialog.querySelector<HTMLInputElement>('input[name="email"]')?.focus()
    return () => {
      dialog.close()
      if (previouslyFocusedElement instanceof HTMLElement && previouslyFocusedElement.isConnected) {
        previouslyFocusedElement.focus()
      }
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      id="desktop-auth-dialog"
      aria-labelledby="desktop-auth-title"
      className="auth-dialog fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto border-0 bg-transparent p-0 text-kurio-cream"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div
        className="flex min-h-full items-center justify-center p-5"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <section className="relative w-full max-w-[500px] border-b-[6px] border-kurio-goldStrong bg-kurio-surface px-6 py-8 md:px-10">
          <button type="button" onClick={onClose} aria-label="Fechar janela de autenticação" className="absolute right-4 top-3 grid h-8 w-8 place-items-center text-xl text-kurio-goldStrong hover:bg-kurio-ink/50">
            ×
          </button>
          <header className="mb-6 flex justify-center pt-2">
            <div className="flex gap-2 font-semibold" role="group" aria-label="Tipo de acesso">
              <button type="button" aria-pressed={mode === 'login'} onClick={() => setMode('login')} className={mode === 'login' ? 'text-kurio-goldStrong' : 'text-kurio-cream/70'}>Entrar</button>
              <span aria-hidden="true">|</span>
              <button type="button" aria-pressed={mode === 'register'} onClick={() => setMode('register')} className={mode === 'register' ? 'text-kurio-goldStrong' : 'text-kurio-cream/70'}>Criar conta</button>
            </div>
          </header>
          <h2 id="desktop-auth-title" className="sr-only">{mode === 'register' ? 'Criar conta na Kurio' : 'Entrar na Kurio'}</h2>
          <AuthFormFields key={mode} mode={mode} autoFocusEmail showPasswordVisibilityToggle={mode === 'register'} onSuccess={onClose} />
        </section>
      </div>
    </dialog>
  )
}

function AuthFormFields({ mode, autoFocusEmail = false, showPasswordVisibilityToggle = false, onSuccess }: { mode: 'login' | 'register'; autoFocusEmail?: boolean; showPasswordVisibilityToggle?: boolean; onSuccess: () => void }) {
  const isRegister = mode === 'register'
  const [passwordVisible, setPasswordVisible] = useState(false)
  const authForm = useAuthForm(mode, onSuccess)
  return (
    <>
      <p className="mb-5 text-center text-xs leading-5 text-kurio-cream/75">{isRegister ? 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.' : 'Entre para gerenciar sua carteira, coleção e perfil de criador.'}</p>
      <form onSubmit={authForm.handleSubmit} className="space-y-3">
        {isRegister && <input aria-label="Nome de usuário" name="username" autoComplete="username" minLength={3} required className={`${fieldClass} mt-0`} placeholder="Nome de usuário" />}
        <input aria-label="E-mail" name="email" type="email" autoComplete="email" autoFocus={autoFocusEmail && !isRegister} required className={`${fieldClass} mt-0`} placeholder="Digite seu e-mail" />
        {showPasswordVisibilityToggle ? (
          <div className="relative">
            <input aria-label="Senha" name="password" type={passwordVisible ? 'text' : 'password'} autoComplete="new-password" minLength={8} required className={`${fieldClass} mt-0 pr-12`} placeholder="Senha" />
            <PasswordVisibilityButton visible={passwordVisible} onToggle={() => setPasswordVisible((visible) => !visible)} />
          </div>
        ) : (
          <input aria-label="Senha" name="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 8 : undefined} required className={`${fieldClass} mt-0`} placeholder="Senha" />
        )}
        {isRegister && <input aria-label="Confirmar senha" name="confirmPassword" type={passwordVisible ? 'text' : 'password'} autoComplete="new-password" minLength={8} required className={`${fieldClass} mt-0`} placeholder="Confirmar senha" />}
        {!isRegister && <Link to="/login" className="block text-right text-xs text-kurio-goldStrong hover:underline">Esqueceu a senha?</Link>}
        <button type="submit" disabled={authForm.isSubmitting} className={`${primaryButtonClass} w-full disabled:opacity-70`}>{authForm.isSubmitting ? 'Aguarde...' : isRegister ? 'Criar conta' : 'Entrar'}</button>
      </form>
      {authForm.error && <p role="alert" className="mt-3 text-center text-xs text-red-300">{authForm.error}</p>}
      <div className="my-5 flex items-center gap-3 text-[10px] text-kurio-cream/70"><span className="h-px flex-1 bg-kurio-line" />Ou continue com<span className="h-px flex-1 bg-kurio-line" /></div>
      <SocialAuthButtons />
    </>
  )
}

function useAuthForm(mode: 'login' | 'register', onSuccess: () => void) {
  const auth = useAuth()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    if (mode === 'register') {
      const username = String(formData.get('username') ?? '').trim()
      const confirmation = String(formData.get('confirmPassword') ?? '')
      if (password !== confirmation) {
        setErrorMessage('As senhas não correspondem.')
        return
      }

      setIsSubmitting(true)
      try {
        await auth.register({ username, email, password })
        onSuccess()
      } catch (error) {
        setErrorMessage(getAuthErrorMessage(error))
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    setIsSubmitting(true)
    try {
      await auth.login({ email, password })
      onSuccess()
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return { handleSubmit, error: errorMessage, isSubmitting }
}

function getAuthErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const response = error.response?.data
    if (response) {
      const fieldError = Object.values(response.fieldErrors ?? {}).flat()[0]
      return fieldError ?? response.message
    }
    if (error.code === 'ECONNABORTED') return 'A solicitação demorou demais. Tente novamente.'
  }

  return 'Não foi possível concluir a solicitação. Verifique sua conexão e tente novamente.'
}

function PasswordVisibilityButton({ visible, onToggle, size = 'compact', label = 'senha' }: { visible: boolean; onToggle: () => void; size?: 'compact' | 'mobile'; label?: string }) {
  return (
    <button
      type="button"
      aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label}`}
      aria-pressed={visible}
      onClick={onToggle}
      className={`absolute right-0 ${size === 'mobile' ? 'top-0 h-12 w-12' : 'top-1 h-10 w-10'} grid place-items-center text-kurio-goldStrong hover:text-kurio-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-kurio-goldStrong`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {visible ? (
          <>
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        ) : (
          <>
            <path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a16.7 16.7 0 0 1-3.2 3.8M6.2 6.2C3.5 8 2 12 2 12s3.5 6 10 6a10.7 10.7 0 0 0 3.7-.7" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </>
        )}
      </svg>
    </button>
  )
}

function AccountLogoutButton({ className }: { className: string }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [logoutError, setLogoutError] = useState<string | null>(null)

  function handleLogout() {
    setLogoutError(null)
    void logout()
      .then(() => navigate({ to: '/login' }))
      .catch(() => setLogoutError('Não foi possível encerrar a sessão. Tente novamente.'))
  }

  return (
    <>
      <button type="button" onClick={handleLogout} className={className}>Sair</button>
      {logoutError && <p role="alert" className="px-3 py-2 text-xs text-red-300">{logoutError}</p>}
    </>
  )
}

function AccountSidebar({ active }: { active: 'profile' | 'wallets' }) {
  const links = [
    { label: 'Dados do perfil', icon: '♙', to: '/profile' as const, key: 'profile' },
    { label: 'Carteiras', icon: '⌖', to: '/wallets' as const, key: 'wallets' },
    { label: 'Atividade', icon: '♧' },
    { label: 'Lista de interesse', icon: '♡' },
    { label: 'Ofertas', icon: '◉' },
    { label: 'Arquivos baixados', icon: '⇩' },
    { label: 'Suporte', icon: '△' },
  ]

  return (
    <aside className="h-fit bg-kurio-surface pb-2">
      <h2 className="px-4 pb-2 pt-3 font-semibold">Meu perfil</h2>
      <nav aria-label="Navegação do perfil">
        {links.map((item) => {
          const isActive = item.key === active
          const className = `flex min-h-9 items-center gap-3 border-l-4 px-3 text-xs ${isActive ? 'border-kurio-goldStrong bg-kurio-ink/40 text-kurio-goldStrong' : 'border-transparent text-kurio-gold/90 hover:bg-kurio-ink/40'}`
          return item.to ? (
            <Link key={item.label} to={item.to} aria-current={isActive ? 'page' : undefined} className={className}>
              <span aria-hidden="true" className="w-3 text-center text-sm">{item.icon}</span>{item.label}
            </Link>
          ) : (
            <span key={item.label} className={className}>
              <span aria-hidden="true" className="w-3 text-center text-sm">{item.icon}</span>{item.label}
            </span>
          )
        })}
        <AccountLogoutButton className="flex min-h-9 w-full items-center gap-3 border-t border-kurio-line px-3 text-left text-xs text-kurio-goldStrong hover:bg-kurio-ink/40" />
      </nav>
    </aside>
  )
}

const profileLabelClass = 'block text-xs text-kurio-cream/90'
const profileFieldClass = 'mt-2 h-12 w-full rounded-md border border-kurio-line bg-transparent px-3 text-sm text-kurio-cream outline-none focus:border-kurio-goldStrong md:h-8 md:rounded-sm'

function ProfileField({ label, type = 'text', required = true }: { label: string; type?: string; required?: boolean }) {
  return (
    <label className={profileLabelClass}>
      {label}{required && <span className="text-kurio-goldStrong">*</span>}
      <input type={type} className={profileFieldClass} required={required} />
    </label>
  )
}

function ProfileEnsField() {
  return (
    <label className={profileLabelClass}>
      Nome ENS<span className="text-kurio-goldStrong">*</span>
      <span className="mt-2 flex gap-2">
        <select aria-label="Sufixo ENS" className="h-12 w-[72px] shrink-0 rounded-md border border-kurio-line bg-kurio-ink px-2 text-sm text-kurio-cream outline-none focus:border-kurio-goldStrong md:h-8 md:w-[64px] md:rounded-sm">
          <option>.eth</option>
        </select>
        <input aria-label="Nome ENS" className="h-12 min-w-0 flex-1 rounded-md border border-kurio-line bg-transparent px-3 text-sm text-kurio-cream outline-none focus:border-kurio-goldStrong md:h-8 md:rounded-sm" required />
      </span>
    </label>
  )
}

function ProfileAvatarControls({ compact = false, showActions = true }: { compact?: boolean; showActions?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className={`${compact ? 'h-14 w-14' : 'h-10 w-10'} grid shrink-0 place-items-center rounded-full bg-kurio-ink text-kurio-goldStrong`}>
        <svg viewBox="0 0 24 24" className={compact ? 'h-7 w-7' : 'h-5 w-5'} fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 20c.5-3.4 2.8-5.3 6.5-5.3s6 1.9 6.5 5.3" />
        </svg>
      </span>
      {showActions && (
        <>
          <button type="button" disabled className={`${primaryButtonClass} h-8 min-h-0 rounded-sm px-4 text-xs disabled:opacity-100`}>Alterar</button>
          <button type="button" disabled className="px-1 text-xs text-kurio-cream/80 disabled:opacity-100">Remover</button>
        </>
      )}
    </div>
  )
}

function ProfilePasswordField({ label, autoComplete }: { label: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <label className={profileLabelClass}>
      {label}
      <span className="relative block">
        <input type={visible ? 'text' : 'password'} autoComplete={autoComplete} className={`${profileFieldClass} pr-10`} />
        <button
          type="button"
          aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-2 top-[calc(50%+4px)] grid h-8 w-8 -translate-y-1/2 place-items-center text-kurio-goldStrong"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {visible ? <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="3" /></> : <><path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a16.7 16.7 0 0 1-3.2 3.8M6.2 6.2C3.5 8 2 12 2 12s3.5 6 10 6a10.7 10.7 0 0 0 3.7-.7" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>}
          </svg>
        </button>
      </span>
    </label>
  )
}

function DesktopProfilePage() {
  return (
    <div className="mx-auto hidden min-h-[calc(100dvh-72px)] w-[calc(100%-48px)] max-w-[960px] grid-cols-[248px_minmax(0,1fr)] gap-[22px] pb-12 pt-3 md:grid">
      <AccountSidebar active="profile" />
      <section>
        <h1 className="mb-7 text-sm font-semibold">Perfil do colecionador</h1>
        <form onSubmit={(event) => event.preventDefault()} className="grid grid-cols-2 gap-x-[22px] gap-y-6">
          <ProfileField label="Nome de exibição" />
          <ProfileField label="Nome de usuário" />
          <ProfileField label="E-mail" type="email" />
          <ProfileEnsField />
          <ProfileField label="Apelido da carteira" />
          <div>
            <p className={profileLabelClass}>Avatar</p>
            <div className="mt-2"><ProfileAvatarControls /></div>
          </div>
          <section className="space-y-4 pt-1">
            <h2 className="font-semibold">Alterar senha</h2>
            <ProfilePasswordField label="Senha atual" autoComplete="current-password" />
            <ProfilePasswordField label="Nova senha" autoComplete="new-password" />
            <ProfilePasswordField label="Confirmar nova senha" autoComplete="new-password" />
            <button type="submit" disabled className={`${primaryButtonClass} h-8 min-h-0 w-[104px] rounded-sm text-xs disabled:opacity-100`}>Salvar</button>
          </section>
        </form>
      </section>
    </div>
  )
}

function MobileProfilePage() {
  const { session } = useAuth()

  return (
    <section className="mx-auto min-h-dvh w-full max-w-lg bg-kurio-ink px-5 pb-8 pt-5 md:hidden">
      <header className="flex items-center justify-between gap-3">
        <Link to="/" search={marketSearch} aria-label="Voltar ao marketplace" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-kurio-surface text-kurio-goldStrong">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-kurio-gold/70">Conta</p>
          <h1 className="mt-1 text-base font-semibold">Meu perfil</h1>
        </div>
        <AccountLogoutButton className="rounded-full border border-kurio-line px-3 py-2 text-xs text-kurio-goldStrong" />
      </header>

      <div className="mt-6 flex items-center gap-4 rounded-2xl bg-kurio-surface p-4">
        <ProfileAvatarControls compact showActions={false} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{session?.user.displayName ?? 'Colecionador'}</p>
          <p className="mt-1 truncate text-xs text-kurio-cream/60">{session?.user.email ?? 'Gerencie seus dados pessoais'}</p>
        </div>
      </div>

      <nav aria-label="Seções da conta" className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-kurio-surface p-1">
        <Link to="/profile" aria-current="page" className="rounded-lg bg-kurio-goldStrong px-3 py-3 text-center text-xs font-semibold text-kurio-ink">Dados do perfil</Link>
        <Link to="/wallets" className="rounded-lg px-3 py-3 text-center text-xs text-kurio-cream/70">Carteiras</Link>
      </nav>

      <form onSubmit={(event) => event.preventDefault()}>
        <section className="mt-5 rounded-2xl bg-kurio-surface p-4">
          <h2 className="mb-4 text-sm font-semibold">Informações pessoais</h2>
          <div className="space-y-4">
            <ProfileField label="Nome de exibição" />
            <ProfileField label="Nome de usuário" />
            <ProfileField label="E-mail" type="email" />
            <ProfileEnsField />
            <ProfileField label="Apelido da carteira" />
            <div>
              <p className={profileLabelClass}>Avatar</p>
              <div className="mt-2"><ProfileAvatarControls /></div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-kurio-surface p-4">
          <h2 className="mb-4 text-sm font-semibold">Alterar senha</h2>
          <div className="space-y-4">
            <ProfilePasswordField label="Senha atual" autoComplete="current-password" />
            <ProfilePasswordField label="Nova senha" autoComplete="new-password" />
            <ProfilePasswordField label="Confirmar nova senha" autoComplete="new-password" />
          </div>
        </section>

        <button type="submit" disabled className={`${primaryButtonClass} mt-5 h-12 w-full rounded-xl disabled:opacity-100`}>Salvar alterações</button>
      </form>
    </section>
  )
}

export function ProfilePage() {
  return (
    <>
      <DesktopProfilePage />
      <MobileProfilePage />
    </>
  )
}

export function WalletsPage() {
  return (
    <div className="layout-container min-h-[70vh] pb-12 pt-8">
      <div className="grid gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
        <AccountSidebar active="wallets" />
        <section>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h1 className="text-lg font-semibold">Carteira principal</h1><p className="mt-1 text-xs text-kurio-gold/80">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p></div>
            <button type="button" disabled className="text-sm text-kurio-goldStrong">Adicionar</button>
          </div>
          <form onSubmit={(event) => event.preventDefault()} className="mt-6 grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <label className={labelClass}>Nome de exibição<span className="text-kurio-goldStrong">*</span><input className={fieldClass} required /></label>
            <label className={labelClass}>Apelido da carteira<span className="text-kurio-goldStrong">*</span><input className={fieldClass} required /></label>
            <label className={labelClass}>Rede<span className="text-kurio-goldStrong">*</span><select className={fieldClass} defaultValue=""><option value="" disabled>Selecione uma rede</option><option>Ethereum</option><option>Polygon</option><option>Solana</option></select></label>
            <label className={labelClass}>Nome do perfil<span className="text-kurio-goldStrong">*</span><input className={fieldClass} required /></label>
            <label className={labelClass}>Endereço da carteira<span className="text-kurio-goldStrong">*</span><input className={fieldClass} placeholder="Endereço 0x da carteira" required /></label>
            <input aria-label="ENS ou carteira secundária (opcional)" className={fieldClass} placeholder="ENS ou carteira secundária (opcional)" />
            <label className={labelClass}>Tipo de carteira<span className="text-kurio-goldStrong">*</span><select className={fieldClass} defaultValue=""><option value="" disabled>Selecione uma carteira</option><option>MetaMask</option><option>WalletConnect</option><option>Coinbase Wallet</option></select></label>
            <label className={labelClass}>Código de indicação<span className="text-kurio-goldStrong">*</span><input className={fieldClass} required /></label>
            <label className={labelClass}>E-mail<span className="text-kurio-goldStrong">*</span><input type="email" className={fieldClass} required /></label>
            <label className={labelClass}>Nome ENS<span className="text-kurio-goldStrong">*</span><div className="flex gap-2"><select className={`${fieldClass} w-20`} aria-label="Sufixo ENS"><option>.eth</option></select><input className={fieldClass} required /></div></label>
            <button type="submit" disabled className={`${primaryButtonClass} w-fit sm:col-span-2`}>Salvar carteira</button>
          </form>
          <section className="mt-8 border-t border-kurio-line pt-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Carteira secundária</h2><span className="text-sm text-kurio-goldStrong">Adicionar</span></div>
            <p className="mt-2 text-xs text-kurio-gold/80">Você ainda não adicionou uma carteira secundária.</p>
          </section>
        </section>
      </div>
    </div>
  )
}
