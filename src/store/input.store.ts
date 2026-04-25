// =============================================================================
// store/input.store.ts
// Global state untuk bottom sheet input transaksi.
// Dipakai oleh FAB, header shortcut, dan komponen lain yang perlu trigger input.
// =============================================================================

import { create } from 'zustand'
import type { TransaksiJenis } from '@/types'

interface InputStore {
  isOpen: boolean
  initialJenis: TransaksiJenis
  open: (jenis?: TransaksiJenis) => void
  close: () => void
}

export const useInputStore = create<InputStore>((set) => ({
  isOpen: false,
  initialJenis: 'keluar',

  open: (jenis = 'keluar') => set({ isOpen: true, initialJenis: jenis }),
  close: () => set({ isOpen: false }),
}))
