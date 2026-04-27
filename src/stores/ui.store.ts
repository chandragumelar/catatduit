import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PeriodType } from '@/features/transaction/transaction.types'
import { STORAGE_KEYS } from '@/core/constants/storage-keys'

interface UIState {
  activeCurrency: string
  activePeriodType: PeriodType
  activeSheet: string | null
}

interface UIActions {
  setActiveCurrency: (currency: string) => void
  setActivePeriodType: (period: PeriodType) => void
  openSheet: (sheetId: string) => void
  closeSheet: () => void
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      activeCurrency: 'IDR',
      activePeriodType: 'monthly',
      activeSheet: null,

      setActiveCurrency: (currency) => set({ activeCurrency: currency }),
      setActivePeriodType: (period) => set({ activePeriodType: period }),
      openSheet: (sheetId) => set({ activeSheet: sheetId }),
      closeSheet: () => set({ activeSheet: null }),
    }),
    {
      name: STORAGE_KEYS.APP_SETTINGS,
      partialize: (state) => ({
        activeCurrency: state.activeCurrency,
        activePeriodType: state.activePeriodType,
      }),
    }
  )
)
