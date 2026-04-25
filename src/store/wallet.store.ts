// =============================================================================
// store/wallet.store.ts
// =============================================================================

import { create } from 'zustand'
import type { Wallet } from '@/types'
import { getWallets, saveWallets } from '@/storage'

interface WalletStore {
  wallets: Wallet[]
  activeWalletId: string
  hydrate: () => void
  setActiveWallet: (id: string) => void
  save: (wallets: Wallet[]) => void
}

export const useWalletStore = create<WalletStore>((set) => ({
  wallets: [],
  activeWalletId: 'utama',

  hydrate: () => set({ wallets: getWallets() }),

  setActiveWallet: (id) => set({ activeWalletId: id }),

  save: (wallets) => {
    saveWallets(wallets)
    set({ wallets })
  },
}))
