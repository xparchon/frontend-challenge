import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addCartItem,
  addFavorite,
  changePassword,
  connectWallet,
  createOrder,
  createWallet,
  deleteWallet,
  disconnectWallet,
  getCart,
  getFavorites,
  getOrder,
  getProfile,
  getWalletBalance,
  getWallets,
  removeCartItem,
  removeFavorite,
  updateAvatar,
  updateCartItem,
  updateCoupon,
  updateProfile,
  updateWallet,
} from '@/lib/api/accountCommerce'
import { readStoredSession } from '@/lib/auth/sessionStorage'
import type { Cart } from '@/types/cart'
import type { CollectorProfile } from '@/types/account'

const userId = () => readStoredSession()?.user.id ?? null
const profileKey = (id: string | null) => ['private', id, 'profile'] as const
const walletsKey = (id: string | null) => ['private', id, 'wallets'] as const
const walletBalanceKey = (id: string | null, walletId: string) => ['private', id, 'wallets', walletId, 'balance'] as const
const favoritesKey = (id: string | null) => ['private', id, 'favorites'] as const
const cartKey = (id: string | null) => ['cart', id ?? 'guest'] as const

export function useProfile() {
  const id = userId()
  return useQuery({
    queryKey: profileKey(id),
    queryFn: getProfile,
    enabled: Boolean(id),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const id = userId()
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData<CollectorProfile>(profileKey(id), profile)
      void queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
    },
  })
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient()
  const id = userId()
  return useMutation({
    mutationFn: updateAvatar,
    onSuccess: (profile) => queryClient.setQueryData<CollectorProfile>(profileKey(id), profile),
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword })
}

export function useWallets() {
  const id = userId()
  return useQuery({
    queryKey: walletsKey(id),
    queryFn: getWallets,
    enabled: Boolean(id),
  })
}

export function useWalletBalance(walletId: string) {
  const id = userId()
  return useQuery({
    queryKey: walletBalanceKey(id, walletId),
    queryFn: () => getWalletBalance(walletId),
    enabled: Boolean(id && walletId),
  })
}

export function useFavorites() {
  const id = userId()
  return useQuery({
    queryKey: favoritesKey(id),
    queryFn: getFavorites,
    enabled: Boolean(id),
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const id = userId()
  const key = favoritesKey(id)
  return useMutation({
    mutationFn: ({ nftId, isFavorite }: { nftId: string; isFavorite: boolean }) =>
      isFavorite ? removeFavorite(nftId) : addFavorite(nftId),
    onMutate: async ({ nftId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<string[]>(key)
      const next = new Set(previous ?? [])
      if (isFavorite) next.delete(nftId)
      else next.add(nftId)
      queryClient.setQueryData(key, [...next])
      return { previous }
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(key, context?.previous ?? [])
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useCreateWallet() {
  const queryClient = useQueryClient()
  const id = userId()
  return useMutation({
    mutationFn: createWallet,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: walletsKey(id) }),
  })
}

export function useUpdateWallet() {
  const queryClient = useQueryClient()
  const id = userId()
  return useMutation({
    mutationFn: updateWallet,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: walletsKey(id) }),
  })
}

export function useDeleteWallet() {
  const queryClient = useQueryClient()
  const id = userId()
  return useMutation({
    mutationFn: deleteWallet,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: walletsKey(id) }),
  })
}

export function useConnectWallet() {
  return useMutation({ mutationFn: connectWallet })
}

export function useDisconnectWallet() {
  return useMutation({ mutationFn: disconnectWallet })
}

export function useCart() {
  const id = userId()
  return useQuery({
    queryKey: cartKey(id),
    queryFn: getCart,
  })
}

export function useAddCartItem() {
  const queryClient = useQueryClient()
  const id = userId()
  return useMutation({
    mutationFn: addCartItem,
    onSuccess: (cart) => queryClient.setQueryData<Cart>(cartKey(id), cart),
  })
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

function recalculate(cart: Cart): Cart {
  const subtotal = cart.items.reduce((total, item) => total + toWei(item.unitPrice) * BigInt(item.quantity), 0n)
  const discount = cart.couponCode === 'KURIO10' ? subtotal / 10n : 0n
  const fee = toWei('0.016') * BigInt(new Set(cart.items.map((item) => item.network)).size)
  return {
    ...cart,
    subtotal: fromWei(subtotal),
    discount: fromWei(discount),
    networkFee: fromWei(fee),
    estimatedFee: fromWei(fee),
    total: fromWei(subtotal - discount + fee),
  }
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  const id = userId()
  const key = cartKey(id)
  return useMutation({
    mutationFn: updateCartItem,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previousCart = queryClient.getQueryData<Cart>(key)
      if (previousCart) {
        const items = previousCart.items.map((item) =>
          item.nftId === input.nftId && item.edition === input.edition
            ? { ...item, quantity: input.quantity }
            : item,
        )
        queryClient.setQueryData(key, recalculate({ ...previousCart, items, quoteVersion: previousCart.quoteVersion + 1 }))
      }
      return { previousCart }
    },
    onError: (_error, _input, context) => {
      if (context?.previousCart) queryClient.setQueryData(key, context.previousCart)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  const id = userId()
  const key = cartKey(id)
  return useMutation({
    mutationFn: removeCartItem,
    onSuccess: (cart) => queryClient.setQueryData<Cart>(key, cart),
  })
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient()
  const id = userId()
  const key = cartKey(id)
  return useMutation({
    mutationFn: updateCoupon,
    onSuccess: (cart) => queryClient.setQueryData<Cart>(key, cart),
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const id = userId()
  return useMutation({
    mutationFn: createOrder,
    onSuccess: (_order, input) => queryClient.invalidateQueries({ queryKey: walletBalanceKey(id, input.walletId) }),
  })
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ['private', userId(), 'orders', orderId],
    queryFn: () => getOrder(orderId),
    enabled: Boolean(userId() && orderId),
  })
}
