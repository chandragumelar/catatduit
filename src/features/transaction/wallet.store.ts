import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Wallet } from '@/features/transaction/transaction.types'
import { STORAGE_KEYS } from '@/core/constants/storage-keys'

const MAX_WALLETS = 10
const MAX_CURRENCIES = 2

interface WalletState {
  wallets: Wallet[]
}

interface WalletActions {
  addWallet: (wallet: Wallet) => { success: boolean; error?: string }
  updateWallet: (id: string, updates: Partial<Omit<Wallet, 'id' | 'createdAt' | 'currencyCode'>>) => void
  removeWallet: (id: string) => { success: boolean; error?: string }
}

export const useWalletStore = create<WalletState & WalletActions>()(
  persist(
    (set, get) => ({
      wallets: [],

      addWallet: (wallet) => {
        const { wallets } = get()

        if (wallets.length >= MAX_WALLETS) {
          return { success: false, error: 'Maksimal 10 dompet, hapus dompet yang tidak dipakai' }
        }

        const existingCurrencies = new Set(wallets.map((w) => w.currencyCode))
        existingCurrencies.add(wallet.currencyCode)
        if (existingCurrencies.size > MAX_CURRENCIES) {
          return { success: false, error: 'Maksimal 2 jenis mata uang' }
        }

        const isDuplicate = wallets.some(
          (w) => w.name.trim().toLowerCase() === wallet.name.trim().toLowerCase()
        )
        if (isDuplicate) {
          return { success: false, error: 'Nama dompet sudah dipakai' }
        }

        set({ wallets: [...wallets, wallet] })
        return { success: true }
      },

      updateWallet: (id, updates) => {
        set((state) => ({
          wallets: state.wallets.map((w) =>
            w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
          ),
        }))
      },

      removeWallet: (id) => {
        const { wallets } = get()

        if (wallets.length <= 1) {
          return { success: false, error: 'Minimal harus ada 1 dompet' }
        }

        set({ wallets: wallets.filter((w) => w.id !== id) })
        return { success: true }
      },
    }),
    { name: STORAGE_KEYS.WALLETS }
  )
)
