import { http, HttpResponse } from 'msw'
import { readStoredSession, storeSession } from '@/lib/auth/sessionStorage'
import { changeMockPassword, getAuthorizedUser, hasMockIdentityConflict, persistMockUser } from '@/mocks/handlers/auth'
import { createNftUpdatedEvent, publishNftUpdated, publishOrderUpdated } from '@/mocks/handlers/realtime'
import { waitForConfiguredNetworkLatency, waitForConfiguredOrderResponseDelay } from '@/mocks/networkScenarios'
import { nfts } from '@/mocks/fixtures/nfts'
import { validateWalletFields } from '@/features/account/walletValidation'
import type { Cart } from '@/types/cart'
import type { CollectorProfile, Wallet, WalletInput } from '@/types/account'
import type { Order } from '@/types/order'
import type { Nft } from '@/types/nft'
import type { User } from '@/types/session'

const profileStorageKey = 'kurio.mock.profiles'
const walletStorageKey = 'kurio.mock.wallets'
const walletBalanceStorageKey = 'kurio.mock.walletBalances'
const favoritesStorageKey = 'kurio.mock.favorites'
const cartStorageKey = 'kurio.mock.carts'
const orderStorageKey = 'kurio.mock.orders'
const idempotencyStorageKey = 'kurio.mock.idempotency'
const availabilityStorageKey = 'kurio.mock.availability'
const priceOverridesStorageKey = 'kurio.mock.priceOverrides'
const realtimeVersionStorageKey = 'kurio.mock.realtimeVersions'
const paymentScenarioStorageKey = 'kurio.mock.paymentOutcome'
const orderSettlementDelayStorageKey = 'kurio.mock.orderSettlementDelayMs'
const connectionScenarioStorageKey = 'kurio.mock.walletConnection'
const favoriteFailureStorageKey = 'kurio.mock.favoriteFailure'
const weiPerEth = 10n ** 18n

interface IdempotencyRecord {
  fingerprint: string
  orderId: string
}

interface PurchaseItemInput {
  nftId: string
  edition: string
  quantity: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readMap<T>(key: string, isValue: (value: unknown) => value is T): Record<string, T> {
  const raw = localStorage.getItem(key)
  if (!raw) return {}

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) throw new Error('Stored data must be an object.')

    const validEntries = Object.entries(parsed).filter((entry): entry is [string, T] => isValue(entry[1]))
    return Object.fromEntries(validEntries)
  } catch (error) {
    console.warn(`Mock data "${key}" is invalid and will be reset.`, error)
    localStorage.removeItem(key)
    return {}
  }
}

function saveMap<T>(key: string, value: Record<string, T>) {
  localStorage.setItem(key, JSON.stringify(value))
}

function isProfile(value: unknown): value is CollectorProfile {
  return isRecord(value) &&
    typeof value.userId === 'string' &&
    typeof value.displayName === 'string' &&
    typeof value.username === 'string' &&
    typeof value.email === 'string' &&
    typeof value.ensName === 'string' &&
    typeof value.walletNickname === 'string' &&
    (typeof value.avatar === 'string' || value.avatar === null)
}

function isWallet(value: unknown): value is Wallet {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    typeof value.address === 'string' &&
    (value.secondaryAddress === undefined || typeof value.secondaryAddress === 'string') &&
    (value.network === 'Ethereum' || value.network === 'Polygon' || value.network === 'Solana') &&
    (value.type === 'WalletConnect' || value.type === 'MetaMask' || value.type === 'Coinbase Wallet') &&
    typeof value.isPrimary === 'boolean'
}

function isWalletList(value: unknown): value is Wallet[] {
  return Array.isArray(value) && value.every(isWallet)
}

function isWalletBalanceRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((amount) => typeof amount === 'string' && /^\d+$/.test(amount))
}

function isFavoriteIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isCartItem(value: unknown) {
  return isRecord(value) &&
    typeof value.nftId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.tokenId === 'string' &&
    typeof value.image === 'string' &&
    (value.network === 'Ethereum' || value.network === 'Polygon' || value.network === 'Solana') &&
    typeof value.edition === 'string' &&
    Number.isInteger(value.quantity) &&
    typeof value.unitPrice === 'string' &&
    Number.isInteger(value.version)
}

function isCart(value: unknown): value is Cart {
  return isRecord(value) &&
    (typeof value.userId === 'string' || value.userId === null) &&
    Array.isArray(value.items) &&
    value.items.every(isCartItem) &&
    (typeof value.couponCode === 'string' || value.couponCode === null) &&
    typeof value.subtotal === 'string' &&
    typeof value.discount === 'string' &&
    typeof value.networkFee === 'string' &&
    typeof value.estimatedFee === 'string' &&
    typeof value.total === 'string' &&
    Number.isInteger(value.quoteVersion)
}

function isOrder(value: unknown): value is Order {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.userId === 'string' &&
    typeof value.idempotencyKey === 'string' &&
    (value.status === 'pending' || value.status === 'confirmed' || value.status === 'rejected') &&
    typeof value.transactionReference === 'string' &&
    typeof value.walletId === 'string' &&
    typeof value.walletAddress === 'string' &&
    typeof value.walletNetwork === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    Number.isInteger(value.version) &&
    isRecord(value.receipt) &&
    Array.isArray(value.receipt.items)
}

function isIdempotencyRecord(value: unknown): value is IdempotencyRecord {
  return isRecord(value) && typeof value.fingerprint === 'string' && typeof value.orderId === 'string'
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
) {
  return HttpResponse.json(
    { code, message, ...(fieldErrors ? { fieldErrors } : {}) },
    { status },
  )
}

function unauthorized() {
  return errorResponse(401, 'UNAUTHORIZED', 'Sua sessão é inválida ou expirou.')
}

function getUser(request: Request): User | null {
  return getAuthorizedUser(request)
}

type CartOwner =
  | { key: string; userId: string | null; error: null }
  | { key: null; userId: null; error: Response }

function getCartOwner(request: Request): CartOwner {
  const hasBearer = request.headers.has('Authorization')
  if (hasBearer) {
    const user = getUser(request)
    if (!user) return { key: null, userId: null, error: unauthorized() }
    return { key: user.id, userId: user.id, error: null }
  }
  return { key: 'guest', userId: null, error: null }
}

function toWei(value: string) {
  const [whole = '0', fraction = ''] = value.split('.')
  return BigInt(whole) * weiPerEth + BigInt(fraction.padEnd(18, '0').slice(0, 18))
}

function fromWei(value: bigint) {
  const whole = value / weiPerEth
  const fraction = (value % weiPerEth).toString().padStart(18, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export function getMockNft(nft: Nft): Nft {
  const stock = readMap<number>(availabilityStorageKey, (value): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0)
  const priceOverrides = readMap<string>(priceOverridesStorageKey, (value): value is string => typeof value === 'string' && /^\d+(\.\d{1,18})?$/.test(value))
  const versions = readMap<number>(realtimeVersionStorageKey, (value): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0)
  const available = stock[nft.id]
  const price = priceOverrides[nft.id]
  const baselineVersion = nft.version + (available === undefined ? 0 : 1) + (price === undefined ? 0 : 1)
  const version = Math.max(versions[nft.id] ?? nft.version, baselineVersion)
  return {
    ...nft,
    ...(available === undefined ? {} : { editionsAvailable: available }),
    ...(price === undefined ? {} : { price }),
    version,
  }
}

function emptyCart(userId: string | null): Cart {
  return {
    userId,
    items: [],
    couponCode: null,
    subtotal: '0',
    discount: '0',
    networkFee: '0.016',
    estimatedFee: '0.016',
    total: '0.016',
    quoteVersion: 1,
  }
}

function calculateCart(cart: Cart): Cart {
  const subtotalWei = cart.items.reduce((total, item) => total + toWei(item.unitPrice) * BigInt(item.quantity), 0n)
  const discountWei = cart.couponCode === 'KURIO10' ? subtotalWei / 10n : 0n
  const feeWei = toWei('0.016') * BigInt(new Set(cart.items.map((item) => item.network)).size)
  return {
    ...cart,
    subtotal: fromWei(subtotalWei),
    discount: fromWei(discountWei),
    networkFee: fromWei(feeWei),
    estimatedFee: fromWei(feeWei),
    total: fromWei(subtotalWei - discountWei + feeWei),
  }
}

function loadCart(key: string, userId: string | null): Cart {
  const carts = readMap(cartStorageKey, isCart)
  let cart = carts[key] ?? emptyCart(userId)

  if (key !== 'guest') {
    const guestCart = carts.guest
    if (guestCart?.items.length) {
      const mergedItems = [...cart.items]
      for (const guestItem of guestCart.items) {
        const nft = nfts.find((item) => item.id === guestItem.nftId)
        const available = nft ? getMockNft(nft).editionsAvailable : 0
        const existing = mergedItems.find((item) => item.nftId === guestItem.nftId && item.edition === guestItem.edition)
        if (existing) existing.quantity = Math.min(available, existing.quantity + guestItem.quantity)
        else if (available > 0) mergedItems.push({ ...guestItem, quantity: Math.min(available, guestItem.quantity) })
      }
      cart = { ...cart, items: mergedItems, quoteVersion: cart.quoteVersion + 1 }
      delete carts.guest
    }
  }

  let changed = false
  const currentItems = cart.items.flatMap((item) => {
    const nft = nfts.find((candidate) => candidate.id === item.nftId)
    if (!nft) {
      changed = true
      return []
    }
    const latestNft = getMockNft(nft)
    if (latestNft.editionsAvailable <= 0) {
      changed = true
      return []
    }
    const quantity = Math.min(item.quantity, latestNft.editionsAvailable)
    if (quantity !== item.quantity || latestNft.price !== item.unitPrice || latestNft.version !== item.version) changed = true
    return [{
      ...item,
      name: latestNft.name,
      tokenId: latestNft.tokenId,
      image: latestNft.image,
      network: latestNft.network,
      unitPrice: latestNft.price,
      version: latestNft.version,
      quantity,
    }]
  })

  if (changed) cart = { ...cart, items: currentItems, quoteVersion: cart.quoteVersion + 1 }
  cart = calculateCart({ ...cart, userId })
  carts[key] = cart
  saveMap(cartStorageKey, carts)
  return cart
}

function saveCart(key: string, cart: Cart) {
  const carts = readMap(cartStorageKey, isCart)
  carts[key] = calculateCart(cart)
  saveMap(cartStorageKey, carts)
  return carts[key]
}

function defaultProfile(user: User): CollectorProfile {
  return {
    userId: user.id,
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    ensName: user.ensName ?? '',
    walletNickname: 'Carteira principal',
    avatar: user.avatar ?? null,
  }
}

function loadProfile(user: User) {
  const profiles = readMap(profileStorageKey, isProfile)
  const profile = profiles[user.id] ?? defaultProfile(user)
  profiles[user.id] = profile
  saveMap(profileStorageKey, profiles)
  return profile
}

function loadWallets(user: User) {
  const wallets = readMap(walletStorageKey, isWalletList)
  if (!wallets[user.id]) {
    const seededWallets: Wallet[] = user.id === 'user-1'
      ? [{
          id: 'wallet-user-1-primary',
          label: 'Principal',
          address: '0xA91F00000000000000000000000000000000E82C',
          network: 'Ethereum',
          type: 'MetaMask',
          isPrimary: true,
        }]
      : user.id === 'user-2'
        ? [{
            id: 'wallet-user-2-primary',
            label: 'Principal',
            address: '0xB23000000000000000000000000000000000A442',
            network: 'Polygon',
            type: 'Coinbase Wallet',
            isPrimary: true,
          }]
        : []
    wallets[user.id] = seededWallets
    saveMap(walletStorageKey, wallets)
  }
  return wallets[user.id] ?? []
}

function loadWalletBalance(userId: string, walletId: string) {
  const balances = readMap(walletBalanceStorageKey, isWalletBalanceRecord)
  return BigInt(balances[userId]?.[walletId] ?? '0')
}

function saveWalletBalance(userId: string, walletId: string, amountWei: bigint) {
  const balances = readMap(walletBalanceStorageKey, isWalletBalanceRecord)
  balances[userId] = { ...balances[userId], [walletId]: amountWei.toString() }
  saveMap(walletBalanceStorageKey, balances)
}

function loadFavorites(userId: string) {
  const favorites = readMap(favoritesStorageKey, isFavoriteIds)
  return favorites[userId] ?? []
}

function saveFavorites(userId: string, nftIds: string[]) {
  const favorites = readMap(favoritesStorageKey, isFavoriteIds)
  favorites[userId] = nftIds
  saveMap(favoritesStorageKey, favorites)
  return nftIds
}

function validateWallet(input: WalletInput) {
  return validateWalletFields(input)
}

function isWalletNetwork(value: unknown): value is Wallet['network'] {
  return value === 'Ethereum' || value === 'Polygon' || value === 'Solana'
}

function isWalletType(value: unknown): value is Wallet['type'] {
  return value === 'WalletConnect' || value === 'MetaMask' || value === 'Coinbase Wallet'
}

function parseWalletInput(payload: Record<string, unknown>) {
  const input: WalletInput = {
    label: typeof payload.label === 'string' ? payload.label.trim() : '',
    address: typeof payload.address === 'string' ? payload.address.trim() : '',
    secondaryAddress: typeof payload.secondaryAddress === 'string' ? payload.secondaryAddress.trim() : '',
    network: isWalletNetwork(payload.network) ? payload.network : 'Ethereum',
    type: isWalletType(payload.type) ? payload.type : 'MetaMask',
    isPrimary: payload.isPrimary === true,
  }
  const errors = validateWallet(input)
  if (!isWalletNetwork(payload.network)) errors.network = ['Selecione uma rede válida.']
  if (!isWalletType(payload.type)) errors.type = ['Selecione um tipo de carteira válido.']
  return { input, errors }
}

function removePurchasedItems(order: Order) {
  const carts = readMap(cartStorageKey, isCart)
  const cart = carts[order.userId]
  if (!cart) return

  const items = cart.items.flatMap((item) => {
    const bought = order.receipt.items.find((receiptItem) => receiptItem.nftId === item.nftId && receiptItem.edition === item.edition)
    if (!bought) return [item]
    const quantity = item.quantity - bought.quantity
    return quantity > 0 ? [{ ...item, quantity }] : []
  })
  saveCart(order.userId, { ...cart, items, couponCode: items.length ? cart.couponCode : null, quoteVersion: cart.quoteVersion + 1 })
}

function reserveOrderStock(order: Order) {
  const stock = readMap<number>(availabilityStorageKey, (value): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0)
  const versions = readMap<number>(realtimeVersionStorageKey, (value): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0)
  const totals = new Map<string, number>()
  const previousNfts = new Map<string, Nft>()
  for (const item of order.receipt.items) totals.set(item.nftId, (totals.get(item.nftId) ?? 0) + item.quantity)
  for (const [nftId, quantity] of totals) {
    const nft = nfts.find((candidate) => candidate.id === nftId)
    if (nft) {
      previousNfts.set(nftId, getMockNft(nft))
      stock[nftId] = Math.max(0, (stock[nftId] ?? nft.editionsAvailable) - quantity)
      versions[nftId] = getMockNft(nft).version + 1
    }
  }
  saveMap(availabilityStorageKey, stock)
  saveMap(realtimeVersionStorageKey, versions)
  for (const [nftId, previous] of previousNfts) {
    const nft = nfts.find((candidate) => candidate.id === nftId)
    if (nft) publishNftUpdated(createNftUpdatedEvent(previous, getMockNft(nft)))
  }
}

function settleOrder(orderId: string) {
  const orders = readMap(orderStorageKey, isOrder)
  const order = orders[orderId]
  if (!order || order.status !== 'pending') return

  const confirmed: Order = { ...order, status: 'confirmed', updatedAt: new Date().toISOString(), version: order.version + 1 }
  orders[orderId] = confirmed
  saveMap(orderStorageKey, orders)
  removePurchasedItems(confirmed)
  reserveOrderStock(confirmed)
  publishOrderUpdated(confirmed)
}

function scheduleOrderSettlement(orderId: string, delay: number) {
  window.setTimeout(() => settleOrder(orderId), delay)
}

function getOrderSettlementDelay() {
  const configuredDelay = Number(localStorage.getItem(orderSettlementDelayStorageKey))
  return Number.isInteger(configuredDelay) && configuredDelay >= 1 && configuredDelay <= 30_000
    ? configuredDelay
    : 1_000
}

export const accountCommerceHandlers = [
  http.put('/api/mock/scenarios/nfts/:nftId', async ({ request, params }) => {
    if (!getUser(request)) return unauthorized()
    const nftId = String(params.nftId)
    const nft = nfts.find((candidate) => candidate.id === nftId)
    if (!nft) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')

    const body: unknown = await request.json()
    const payload = isRecord(body) ? body : {}
    const hasPrice = Object.prototype.hasOwnProperty.call(payload, 'price')
    const hasAvailability = Object.prototype.hasOwnProperty.call(payload, 'editionsAvailable')
    if (!hasPrice && !hasAvailability) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Informe o preço ou a disponibilidade a alterar.')
    }

    const priceIsValid = payload.price === null || (
      typeof payload.price === 'string' &&
      /^\d+(\.\d{1,18})?$/.test(payload.price) &&
      Number(payload.price) > 0
    )
    const availabilityIsValid = payload.editionsAvailable === null || (
      typeof payload.editionsAvailable === 'number' &&
      Number.isInteger(payload.editionsAvailable) &&
      payload.editionsAvailable >= 0
    )
    if ((hasPrice && !priceIsValid) || (hasAvailability && !availabilityIsValid)) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Preço ou disponibilidade inválidos.')
    }
    if (payload.eventSequence !== undefined && typeof payload.eventSequence !== 'boolean') {
      return errorResponse(422, 'VALIDATION_ERROR', 'A sequência de eventos deve ser booleana.')
    }

    const previous = getMockNft(nft)
    const priceOverrides = readMap<string>(priceOverridesStorageKey, (value): value is string => typeof value === 'string' && /^\d+(\.\d{1,18})?$/.test(value))
    const availability = readMap<number>(availabilityStorageKey, (value): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0)
    const nextPrice = hasPrice
      ? payload.price === null ? nft.price : typeof payload.price === 'string' ? payload.price : previous.price
      : previous.price
    const nextAvailability = hasAvailability
      ? payload.editionsAvailable === null ? nft.editionsAvailable : typeof payload.editionsAvailable === 'number' ? payload.editionsAvailable : previous.editionsAvailable
      : previous.editionsAvailable
    const changed = nextPrice !== previous.price || nextAvailability !== previous.editionsAvailable

    if (changed) {
      if (nextPrice === nft.price) delete priceOverrides[nftId]
      else priceOverrides[nftId] = nextPrice
      if (nextAvailability === nft.editionsAvailable) delete availability[nftId]
      else availability[nftId] = nextAvailability

      const versions = readMap<number>(realtimeVersionStorageKey, (value): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0)
      versions[nftId] = previous.version + 1
      saveMap(priceOverridesStorageKey, priceOverrides)
      saveMap(availabilityStorageKey, availability)
      saveMap(realtimeVersionStorageKey, versions)

      const updated = getMockNft(nft)
      const event = createNftUpdatedEvent(previous, updated)
      publishNftUpdated(event)
      if (payload.eventSequence === true) {
        publishNftUpdated({
          ...event,
          eventId: `nft:${nftId}:${previous.version}`,
          version: previous.version,
          nft: previous,
        })
        publishNftUpdated(event)
      }
      return HttpResponse.json(updated)
    }

    return HttpResponse.json(getMockNft(nft))
  }),

  http.get('/api/profile', ({ request }) => {
    const user = getUser(request)
    return user ? HttpResponse.json(loadProfile(user)) : unauthorized()
  }),

  http.put('/api/profile', async ({ request }) => {
    const user = getUser(request)
    if (!user) return unauthorized()
    const body: unknown = await request.json()
    const payload = isRecord(body) ? body : {}
    const displayName = typeof payload.displayName === 'string' ? payload.displayName.trim() : ''
    const username = typeof payload.username === 'string' ? payload.username.trim() : ''
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
    const ensName = typeof payload.ensName === 'string' ? payload.ensName.trim() : ''
    const walletNickname = typeof payload.walletNickname === 'string' ? payload.walletNickname.trim() : ''
    const fieldErrors: Record<string, string[]> = {}

    if (displayName.length < 2) fieldErrors.displayName = ['Use ao menos 2 caracteres.']
    if (username.length < 3) fieldErrors.username = ['Use ao menos 3 caracteres.']
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = ['Informe um e-mail válido.']
    if (walletNickname.length < 2) fieldErrors.walletNickname = ['Informe um apelido de carteira.']
    if (Object.keys(fieldErrors).length) return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fieldErrors)
    if (await hasMockIdentityConflict(user.id, email, username)) {
      return errorResponse(409, 'CONFLICT', 'Este e-mail ou nome de usuário já está em uso.', {
        email: ['E-mail ou nome de usuário já cadastrado.'],
      })
    }

    const profile: CollectorProfile = { ...loadProfile(user), displayName, username, email, ensName, walletNickname }
    const profiles = readMap(profileStorageKey, isProfile)
    profiles[user.id] = profile
    saveMap(profileStorageKey, profiles)

    const updatedUser: User = { ...user, displayName, username, email, ensName }
    await persistMockUser(updatedUser)
    const session = readStoredSession()
    if (session?.user.id === user.id) {
      storeSession({ ...session, user: updatedUser })
    }
    return HttpResponse.json(profile)
  }),

  http.put('/api/profile/avatar', async ({ request }) => {
    const user = getUser(request)
    if (!user) return unauthorized()
    const body: unknown = await request.json()
    const avatar = isRecord(body) && typeof body.avatar === 'string' ? body.avatar : ''
    if (avatar.length > 2_800_000 || (avatar && !avatar.startsWith('data:image/'))) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Envie uma imagem válida de até 2 MB.', { avatar: ['Imagem inválida ou maior que 2 MB.'] })
    }

    const profiles = readMap(profileStorageKey, isProfile)
    const profile = { ...loadProfile(user), avatar: avatar || null }
    profiles[user.id] = profile
    saveMap(profileStorageKey, profiles)
    const updatedUser: User = { ...user, avatar: profile.avatar ?? undefined }
    await persistMockUser(updatedUser)
    const session = readStoredSession()
    if (session?.user.id === user.id) storeSession({ ...session, user: updatedUser })
    return HttpResponse.json(profile)
  }),

  http.post('/api/profile/password', async ({ request }) => {
    const user = getUser(request)
    if (!user) return unauthorized()
    const body: unknown = await request.json()
    const payload = isRecord(body) ? body : {}
    const currentPassword = typeof payload.currentPassword === 'string' ? payload.currentPassword : ''
    const newPassword = typeof payload.newPassword === 'string' ? payload.newPassword : ''
    const confirmPassword = typeof payload.confirmPassword === 'string' ? payload.confirmPassword : ''
    const fieldErrors: Record<string, string[]> = {}
    if (newPassword.length < 8) fieldErrors.newPassword = ['A nova senha deve ter ao menos 8 caracteres.']
    if (newPassword !== confirmPassword) fieldErrors.confirmPassword = ['As senhas não coincidem.']
    if (Object.keys(fieldErrors).length) return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fieldErrors)

    const changed = await changeMockPassword(user.id, currentPassword, newPassword)
    if (!changed) return errorResponse(422, 'VALIDATION_ERROR', 'A senha atual está incorreta.', { currentPassword: ['A senha atual está incorreta.'] })
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/wallets/:walletId/connect', ({ request, params }) => {
    const user = getUser(request)
    if (!user) return unauthorized()
    const wallet = loadWallets(user).find((item) => item.id === String(params.walletId))
    if (!wallet) return errorResponse(404, 'NOT_FOUND', 'Carteira não encontrada.')
    if (localStorage.getItem(connectionScenarioStorageKey) === 'rejected') {
      return errorResponse(409, 'CONFLICT', 'A conexão da carteira foi recusada.')
    }
    return HttpResponse.json({ walletId: wallet.id, connected: true, network: wallet.network })
  }),

  http.post('/api/wallets/:walletId/disconnect', ({ request, params }) => {
    const user = getUser(request)
    if (!user) return unauthorized()
    const wallet = loadWallets(user).find((item) => item.id === String(params.walletId))
    if (!wallet) return errorResponse(404, 'NOT_FOUND', 'Carteira não encontrada.')
    return HttpResponse.json({ walletId: wallet.id, connected: false, network: wallet.network })
  }),

  http.get('/api/wallets', ({ request }) => {
    const user = getUser(request)
    return user ? HttpResponse.json(loadWallets(user)) : unauthorized()
  }),

  http.get('/api/wallets/:walletId/balance', ({ request, params }) => {
    const user = getUser(request)
    if (!user) return unauthorized()
    const walletId = String(params.walletId)
    const wallet = loadWallets(user).find((item) => item.id === walletId)
    if (!wallet) return errorResponse(404, 'NOT_FOUND', 'Carteira não encontrada.')
    return HttpResponse.json({ walletId, amount: fromWei(loadWalletBalance(user.id, walletId)) })
  }),

  http.get('/api/favorites', ({ request }) => {
    const user = getUser(request)
    return user ? HttpResponse.json(loadFavorites(user.id)) : unauthorized()
  }),

  http.put('/api/favorites/:nftId', ({ request, params }) => {
    const user = getUser(request)
    if (!user) return unauthorized()
    const nftId = String(params.nftId)
    if (!nfts.some((item) => item.id === nftId)) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    if (localStorage.getItem(favoriteFailureStorageKey) === 'true') {
      return errorResponse(503, 'TRANSIENT_ERROR', 'Não foi possível atualizar os favoritos. Tente novamente.')
    }
    return HttpResponse.json(saveFavorites(user.id, [...new Set([...loadFavorites(user.id), nftId])]))
  }),

  http.delete('/api/favorites/:nftId', ({ request, params }) => {
    const user = getUser(request)
    if (!user) return unauthorized()
    const nftId = String(params.nftId)
    if (!nfts.some((item) => item.id === nftId)) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    if (localStorage.getItem(favoriteFailureStorageKey) === 'true') {
      return errorResponse(503, 'TRANSIENT_ERROR', 'Não foi possível atualizar os favoritos. Tente novamente.')
    }
    return HttpResponse.json(saveFavorites(user.id, loadFavorites(user.id).filter((favoriteId) => favoriteId !== nftId)))
  }),

  http.post('/api/wallets', async ({ request }) => {
    const user = getUser(request)
    if (!user) return unauthorized()
    const body: unknown = await request.json()
    const payload = isRecord(body) ? body : {}
    const { input, errors } = parseWalletInput(payload)
    if (Object.keys(errors).length) return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', errors)

    const wallets = readMap(walletStorageKey, isWalletList)
    const current = loadWallets(user)
    if (current.some((wallet) => wallet.network === input.network && wallet.address.toLowerCase() === input.address.toLowerCase())) {
      return errorResponse(409, 'CONFLICT', 'Esta carteira já foi adicionada.', { address: ['Endereço já cadastrado.'] })
    }
    const wallet: Wallet = {
      id: `wallet-${crypto.randomUUID()}`,
      label: input.label,
      address: input.address,
      secondaryAddress: input.secondaryAddress,
      network: input.network,
      type: input.type,
      isPrimary: input.isPrimary || current.length === 0,
    }
    const updated = wallet.isPrimary ? current.map((item) => ({ ...item, isPrimary: false })) : current
    wallets[user.id] = [...updated, wallet]
    saveMap(walletStorageKey, wallets)
    return HttpResponse.json(wallet, { status: 201 })
  }),

  http.put('/api/wallets/:walletId', async ({ request, params }) => {
    const user = getUser(request)
    if (!user) return unauthorized()
    const walletId = String(params.walletId)
    const body: unknown = await request.json()
    const payload = isRecord(body) ? body : {}
    const { input, errors } = parseWalletInput(payload)
    if (Object.keys(errors).length) return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', errors)

    const wallets = readMap(walletStorageKey, isWalletList)
    const current = loadWallets(user)
    if (!current.some((wallet) => wallet.id === walletId)) return errorResponse(404, 'NOT_FOUND', 'Carteira não encontrada.')
    if (current.some((wallet) => wallet.id !== walletId && wallet.network === input.network && wallet.address.toLowerCase() === input.address.toLowerCase())) {
      return errorResponse(409, 'CONFLICT', 'Esta carteira já foi adicionada.', { address: ['Endereço já cadastrado.'] })
    }
    const updated = current.map((wallet) => wallet.id === walletId
      ? { ...wallet, label: input.label, address: input.address, secondaryAddress: input.secondaryAddress, network: input.network, type: input.type, isPrimary: input.isPrimary === true }
      : { ...wallet, isPrimary: input.isPrimary ? false : wallet.isPrimary })
    wallets[user.id] = updated
    saveMap(walletStorageKey, wallets)
    return HttpResponse.json(updated.find((wallet) => wallet.id === walletId))
  }),

  http.delete('/api/wallets/:walletId', ({ request, params }) => {
    const user = getUser(request)
    if (!user) return unauthorized()
    const walletId = String(params.walletId)
    const wallets = readMap(walletStorageKey, isWalletList)
    const current = loadWallets(user)
    const wallet = current.find((item) => item.id === walletId)
    if (!wallet) return errorResponse(404, 'NOT_FOUND', 'Carteira não encontrada.')
    if (wallet.isPrimary && current.length > 1) return errorResponse(409, 'CONFLICT', 'Defina outra carteira principal antes de removê-la.')
    wallets[user.id] = current.filter((item) => item.id !== walletId)
    saveMap(walletStorageKey, wallets)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/cart', async ({ request }) => {
    await waitForConfiguredNetworkLatency()
    const owner = getCartOwner(request)
    if (owner.error) return owner.error
    return HttpResponse.json(loadCart(owner.key, owner.userId))
  }),

  http.post('/api/cart/items', async ({ request }) => {
    const owner = getCartOwner(request)
    if (owner.error) return owner.error
    const body: unknown = await request.json()
    const payload = isRecord(body) ? body : {}
    const nftId = typeof payload.nftId === 'string' ? payload.nftId : ''
    const edition = typeof payload.edition === 'string' ? payload.edition : ''
    const quantity = Number(payload.quantity)
    const product = nfts.find((item) => item.id === nftId)
    if (!product) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    const nft = getMockNft(product)
    if (!Number.isInteger(quantity) || quantity < 1) return errorResponse(422, 'VALIDATION_ERROR', 'Informe uma quantidade válida.', { quantity: ['A quantidade deve ser um inteiro positivo.'] })
    const cart = loadCart(owner.key, owner.userId)
    const current = cart.items.find((item) => item.nftId === nftId && item.edition === edition)
    const nextQuantity = (current?.quantity ?? 0) + quantity
    if (nextQuantity > nft.editionsAvailable) {
      return errorResponse(409, 'CONFLICT', 'A quantidade solicitada não está mais disponível.', { quantity: [`Disponíveis: ${nft.editionsAvailable}.`] })
    }
    const item = {
      nftId,
      name: nft.name,
      tokenId: nft.tokenId,
      image: nft.image,
      network: nft.network,
      edition,
      quantity: nextQuantity,
      unitPrice: nft.price,
      version: nft.version,
    }
    const items = current
      ? cart.items.map((cartItem) => cartItem.nftId === nftId && cartItem.edition === edition ? item : cartItem)
      : [...cart.items, item]
    const updated = saveCart(owner.key, { ...cart, items, quoteVersion: cart.quoteVersion + 1 })
    return HttpResponse.json(updated, { status: 201 })
  }),

  http.patch('/api/cart/items/:nftId', async ({ request, params }) => {
    const owner = getCartOwner(request)
    if (owner.error) return owner.error
    const nftId = String(params.nftId)
    const body: unknown = await request.json()
    const payload = isRecord(body) ? body : {}
    const quantity = Number(payload.quantity)
    const edition = typeof payload.edition === 'string' ? payload.edition : ''
    if (!Number.isInteger(quantity) || quantity < 1) return errorResponse(422, 'VALIDATION_ERROR', 'Informe uma quantidade válida.')
    const product = nfts.find((item) => item.id === nftId)
    if (!product) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    const nft = getMockNft(product)
    if (quantity > nft.editionsAvailable) return errorResponse(409, 'CONFLICT', 'A quantidade solicitada não está mais disponível.')
    const cart = loadCart(owner.key, owner.userId)
    const exists = cart.items.some((item) => item.nftId === nftId && item.edition === edition)
    if (!exists) return errorResponse(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
    const updatedItems = cart.items.map((item) => item.nftId === nftId && item.edition === edition ? { ...item, quantity } : item)
    return HttpResponse.json(saveCart(owner.key, { ...cart, items: updatedItems, quoteVersion: cart.quoteVersion + 1 }))
  }),

  http.delete('/api/cart/items/:nftId', ({ request, params }) => {
    const owner = getCartOwner(request)
    if (owner.error) return owner.error
    const nftId = String(params.nftId)
    const edition = new URL(request.url).searchParams.get('edition') ?? ''
    const cart = loadCart(owner.key, owner.userId)
    const items = cart.items.filter((item) => item.nftId !== nftId || item.edition !== edition)
    if (items.length === cart.items.length) return errorResponse(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
    return HttpResponse.json(saveCart(owner.key, { ...cart, items, quoteVersion: cart.quoteVersion + 1 }))
  }),

  http.put('/api/cart/coupon', async ({ request }) => {
    const owner = getCartOwner(request)
    if (owner.error) return owner.error
    const body: unknown = await request.json()
    const payload = isRecord(body) ? body : {}
    const couponCode = typeof payload.couponCode === 'string' ? payload.couponCode.trim().toUpperCase() : ''
    if (couponCode === 'EXPIRED10') return errorResponse(422, 'VALIDATION_ERROR', 'Este cupom expirou.')
    if (couponCode && couponCode !== 'KURIO10') return errorResponse(422, 'VALIDATION_ERROR', 'Cupom inválido.')
    const cart = loadCart(owner.key, owner.userId)
    return HttpResponse.json(saveCart(owner.key, { ...cart, couponCode: couponCode || null, quoteVersion: cart.quoteVersion + 1 }))
  }),

  http.post('/api/orders', async ({ request }) => {
    const user = getUser(request)
    if (!user) return unauthorized()
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? ''
    if (!idempotencyKey) return errorResponse(422, 'VALIDATION_ERROR', 'A chave de idempotência é obrigatória.')
    const body: unknown = await request.json()
    const payload = isRecord(body) ? body : {}
    const walletId = typeof payload.walletId === 'string' ? payload.walletId : ''
    const quoteVersion = Number(payload.quoteVersion)
    const submittedItems = Array.isArray(payload.items)
      ? payload.items.filter((item): item is PurchaseItemInput =>
          isRecord(item) &&
          typeof item.nftId === 'string' &&
          typeof item.edition === 'string' &&
          typeof item.quantity === 'number' &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0,
        )
      : []
    if (!walletId || !Number.isInteger(quoteVersion) || submittedItems.length !== (Array.isArray(payload.items) ? payload.items.length : 0)) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Dados do pedido inválidos.')
    }

    const fingerprint = JSON.stringify({
      walletId,
      quoteVersion,
      items: submittedItems.map(({ nftId, edition, quantity }) => ({ nftId, edition, quantity })),
    })
    const idempotency = readMap(idempotencyStorageKey, isIdempotencyRecord)
    const idempotencyId = `${user.id}:${idempotencyKey}`
    const previousAttempt = idempotency[idempotencyId]
    const orders = readMap(orderStorageKey, isOrder)
    if (previousAttempt) {
      if (previousAttempt.fingerprint !== fingerprint) return errorResponse(409, 'CONFLICT', 'Esta chave de idempotência já foi usada com outros dados.')
      const existingOrder = orders[previousAttempt.orderId]
      if (existingOrder) return HttpResponse.json(existingOrder)
    }

    const wallets = loadWallets(user)
    const wallet = wallets.find((item) => item.id === walletId)
    if (!wallet) return errorResponse(422, 'VALIDATION_ERROR', 'Selecione uma carteira cadastrada.', { walletId: ['Carteira inválida.'] })
    const cart = loadCart(user.id, user.id)
    if (!cart.items.length) return errorResponse(422, 'VALIDATION_ERROR', 'Seu carrinho está vazio.')
    const networkItems = cart.items.filter((item) => item.network === wallet.network)
    if (!networkItems.length) return errorResponse(422, 'VALIDATION_ERROR', 'Não há itens do carrinho nesta rede.')
    const currentItems = networkItems.map(({ nftId, edition, quantity }) => ({ nftId, edition, quantity }))
    if (quoteVersion !== cart.quoteVersion || JSON.stringify(currentItems) !== JSON.stringify(submittedItems)) {
      return HttpResponse.json({ code: 'CONFLICT', message: 'A cotação mudou. Revise o total antes de confirmar.', cart }, { status: 409 })
    }

    const subtotalWei = networkItems.reduce((total, item) => total + toWei(item.unitPrice) * BigInt(item.quantity), 0n)
    const discountWei = cart.couponCode === 'KURIO10' ? subtotalWei / 10n : 0n
    const networkFeeWei = toWei('0.016')
    const totalWei = subtotalWei - discountWei + networkFeeWei
    const balanceWei = loadWalletBalance(user.id, wallet.id)
    const outcome = localStorage.getItem(paymentScenarioStorageKey)
    const status = outcome === 'rejected' ? 'rejected' : outcome === 'pending' ? 'pending' : 'confirmed'
    if (status !== 'rejected' && totalWei > balanceWei) {
      return errorResponse(
        402,
        'PAYMENT_REQUIRED',
        `Saldo insuficiente. Disponível: ${fromWei(balanceWei)} ETH; total da compra: ${fromWei(totalWei)} ETH.`,
      )
    }
    const now = new Date().toISOString()
    const order: Order = {
      id: `order-${crypto.randomUUID()}`,
      userId: user.id,
      idempotencyKey,
      status,
      transactionReference: `0x${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}`,
      walletId: wallet.id,
      walletAddress: wallet.address,
      walletNetwork: wallet.network,
      createdAt: now,
      updatedAt: now,
      version: 1,
      receipt: {
        items: networkItems.map((item) => ({
          nftId: item.nftId,
          name: item.name,
          tokenId: item.tokenId,
          edition: item.edition,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: fromWei(toWei(item.unitPrice) * BigInt(item.quantity)),
          image: item.image,
        })),
        subtotal: fromWei(subtotalWei),
        discount: fromWei(discountWei),
        networkFee: fromWei(networkFeeWei),
        total: fromWei(totalWei),
        quoteVersion: cart.quoteVersion,
      },
    }
    orders[order.id] = order
    saveMap(orderStorageKey, orders)
    if (status === 'confirmed' || status === 'pending') saveWalletBalance(user.id, wallet.id, balanceWei - totalWei)
    idempotency[idempotencyId] = { fingerprint, orderId: order.id }
    saveMap(idempotencyStorageKey, idempotency)

    if (order.status === 'confirmed') {
      removePurchasedItems(order)
      reserveOrderStock(order)
    } else if (order.status === 'pending') {
      scheduleOrderSettlement(order.id, getOrderSettlementDelay())
    }
    publishOrderUpdated(order)

    await waitForConfiguredOrderResponseDelay()
    return HttpResponse.json(order, { status: 201 })
  }),

  http.post('/api/mock/scenarios/orders/:orderId/events', ({ request, params }) => {
    const user = getUser(request)
    if (!user) return unauthorized()
    const orders = readMap(orderStorageKey, isOrder)
    const order = orders[String(params.orderId)]
    if (!order || order.userId !== user.id) return errorResponse(404, 'NOT_FOUND', 'Pedido não encontrado.')
    if (order.status === 'pending') {
      return errorResponse(409, 'CONFLICT', 'O pedido precisa estar em estado terminal para testar eventos antigos.')
    }

    const updated: Order = { ...order, version: order.version + 1, updatedAt: new Date().toISOString() }
    const stale: Order = { ...order, status: 'pending' }
    orders[order.id] = updated
    saveMap(orderStorageKey, orders)
    publishOrderUpdated(updated)
    publishOrderUpdated(stale)
    publishOrderUpdated(updated)
    return HttpResponse.json(updated)
  }),

  http.get('/api/orders/:orderId', ({ request, params }) => {
    const user = getUser(request)
    if (!user) return unauthorized()
    const orders = readMap(orderStorageKey, isOrder)
    let order = orders[String(params.orderId)]
    if (!order || order.userId !== user.id) return errorResponse(404, 'NOT_FOUND', 'Pedido não encontrado.')
    if (order.status === 'pending') {
      const remainingTime = Math.max(0, getOrderSettlementDelay() - (Date.now() - Date.parse(order.createdAt)))
      if (remainingTime === 0) {
        settleOrder(order.id)
        order = readMap(orderStorageKey, isOrder)[order.id] ?? order
      } else {
        scheduleOrderSettlement(order.id, remainingTime)
      }
    }
    return HttpResponse.json(order)
  }),
]
