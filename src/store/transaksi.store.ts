// =============================================================================
// store/transaksi.store.ts
// =============================================================================

import { create } from 'zustand'
import type { Transaksi } from '@/types'
import { getTransaksi, addTransaksi, updateTransaksi, deleteTransaksi, addTransferPair } from '@/storage'

interface TransaksiStore {
  transaksi: Transaksi[]
  hydrate: () => void
  add: (tx: Transaksi) => void
  addPair: (out: Transaksi, ins: Transaksi) => void
  update: (id: string, patch: Partial<Transaksi>) => void
  remove: (id: string) => void
}

export const useTransaksiStore = create<TransaksiStore>((set) => ({
  transaksi: [],

  hydrate: () => set({ transaksi: getTransaksi() }),

  add: (tx) => {
    addTransaksi(tx)
    set({ transaksi: getTransaksi() })
  },

  addPair: (out, ins) => {
    addTransferPair(out, ins)
    set({ transaksi: getTransaksi() })
  },

  update: (id, patch) => {
    updateTransaksi(id, patch)
    set({ transaksi: getTransaksi() })
  },

  remove: (id) => {
    deleteTransaksi(id)
    set({ transaksi: getTransaksi() })
  },
}))
