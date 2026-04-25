// =============================================================================
// store/transfer.store.ts
// Global state untuk TransferBottomSheet.
// Entry point: tombol "⇄ Antar Dompet" di header HomePage.
// =============================================================================

import { create } from 'zustand'

interface TransferStore {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useTransferStore = create<TransferStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
