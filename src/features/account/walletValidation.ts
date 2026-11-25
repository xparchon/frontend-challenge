import type { WalletInput } from '@/types/account'

export type WalletFieldErrors = Partial<Record<'label' | 'address' | 'network' | 'type', string[]>>

export function validateWalletFields(input: Pick<WalletInput, 'label' | 'address' | 'network'>): WalletFieldErrors {
  const errors: WalletFieldErrors = {}
  const label = input.label.trim()
  const address = input.address.trim()

  if (label.length < 2) errors.label = ['Informe um apelido com ao menos 2 caracteres.']
  if (!address) errors.address = ['Informe o endereço da carteira.']
  else if (input.network === 'Solana' && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    errors.address = ['Informe um endereço Solana Base58 com 32 a 44 caracteres.']
  } else if (input.network !== 'Solana' && !/^0x[0-9a-f]{40}$/i.test(address)) {
    errors.address = ['Informe um endereço Ethereum ou Polygon no formato 0x seguido de 40 caracteres hexadecimais.']
  }

  return errors
}
