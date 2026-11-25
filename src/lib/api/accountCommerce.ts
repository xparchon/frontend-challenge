import { api } from '@/lib/api/axios'
import type { Cart } from '@/types/cart'
import type { CollectorProfile, Wallet, WalletBalance, WalletInput } from '@/types/account'
import type { Order } from '@/types/order'

export async function getProfile() {
  const { data } = await api.get<CollectorProfile>('/profile')
  return data
}

export async function updateProfile(profile: Pick<CollectorProfile, 'displayName' | 'username' | 'email' | 'ensName' | 'walletNickname'>) {
  const { data } = await api.put<CollectorProfile>('/profile', profile)
  return data
}

export async function updateAvatar(avatar: string) {
  const { data } = await api.put<CollectorProfile>('/profile/avatar', { avatar })
  return data
}

export async function changePassword(input: { currentPassword: string; newPassword: string; confirmPassword: string }) {
  await api.post('/profile/password', input)
}

export async function getWallets() {
  const { data } = await api.get<Wallet[]>('/wallets')
  return data
}

export async function getWalletBalance(walletId: string) {
  const { data } = await api.get<WalletBalance>(`/wallets/${walletId}/balance`)
  return data
}

export async function getFavorites() {
  const { data } = await api.get<string[]>('/favorites')
  return data
}

export async function addFavorite(nftId: string) {
  const { data } = await api.put<string[]>(`/favorites/${nftId}`)
  return data
}

export async function removeFavorite(nftId: string) {
  const { data } = await api.delete<string[]>(`/favorites/${nftId}`)
  return data
}

export async function createWallet(wallet: WalletInput) {
  const { data } = await api.post<Wallet>('/wallets', wallet)
  return data
}

export async function updateWallet({ id, ...wallet }: Wallet) {
  const { data } = await api.put<Wallet>(`/wallets/${id}`, wallet)
  return data
}

export async function deleteWallet(walletId: string) {
  await api.delete(`/wallets/${walletId}`)
}

export async function connectWallet(walletId: string) {
  const { data } = await api.post<{ walletId: string; connected: boolean; network: string }>(`/wallets/${walletId}/connect`)
  return data
}

export async function disconnectWallet(walletId: string) {
  const { data } = await api.post<{ walletId: string; connected: boolean; network: string }>(`/wallets/${walletId}/disconnect`)
  return data
}

export async function getCart() {
  const { data } = await api.get<Cart>('/cart')
  return data
}

export async function addCartItem(input: { nftId: string; edition: string; quantity: number }) {
  const { data } = await api.post<Cart>('/cart/items', input)
  return data
}

export async function updateCartItem(input: { nftId: string; edition: string; quantity: number }) {
  const { data } = await api.patch<Cart>(`/cart/items/${input.nftId}`, {
    edition: input.edition,
    quantity: input.quantity,
  })
  return data
}

export async function removeCartItem(input: { nftId: string; edition: string }) {
  const { data } = await api.delete<Cart>(`/cart/items/${input.nftId}`, { params: { edition: input.edition } })
  return data
}

export async function updateCoupon(couponCode: string) {
  const { data } = await api.put<Cart>('/cart/coupon', { couponCode })
  return data
}

export async function createOrder(input: {
  walletId: string
  quoteVersion: number
  idempotencyKey: string
  items: Array<{ nftId: string; edition: string; quantity: number }>
}) {
  const { data } = await api.post<Order>(
    '/orders',
    { walletId: input.walletId, quoteVersion: input.quoteVersion, items: input.items },
    { headers: { 'Idempotency-Key': input.idempotencyKey } },
  )
  return data
}

export async function getOrder(orderId: string) {
  const { data } = await api.get<Order>(`/orders/${orderId}`)
  return data
}
