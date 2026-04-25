// =============================================================================
// storage/storage.wallet.ts
// =============================================================================

import type { Wallet } from '@/types'
import { STORAGE_KEYS, DEFAULT_WALLET_ID } from '@/constants'
import { getData, setData } from './storage.base'

const DEFAULT_WALLET: Wallet = {
  id: DEFAULT_WALLET_ID,
  nama: 'Dompet Utama',
  icon: '👛',
  saldo_awal: 0,
  currency: 'IDR',
}

export function getWallets(): Wallet[] {
  const wallets = getData<Wallet[]>(STORAGE_KEYS.WALLETS, [])
  return wallets.length > 0 ? wallets : [DEFAULT_WALLET]
}

export function saveWallets(data: Wallet[]): boolean {
  return setData(STORAGE_KEYS.WALLETS, data)
}

export function getWalletById(id: string): Wallet | undefined {
  return getWallets().find(w => w.id === id)
}
