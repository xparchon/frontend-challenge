export interface CollectorProfile {
  userId: string
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
  avatar: string | null
}

export interface Wallet {
  id: string
  label: string
  address: string
  secondaryAddress?: string
  network: 'Ethereum' | 'Polygon' | 'Solana'
  type: 'WalletConnect' | 'MetaMask' | 'Coinbase Wallet'
  isPrimary: boolean
}

export interface WalletBalance {
  walletId: string
  amount: string
}

export type WalletInput = Omit<Wallet, 'id' | 'isPrimary'> & { isPrimary?: boolean }
