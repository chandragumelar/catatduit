import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NudgeState } from '@/features/transaction/transaction.types'
import { STORAGE_KEYS } from '@/core/constants/storage-keys'

interface NudgeStoreActions {
  markFirstTransaction: () => void
  markFirstBill: () => void
  markFirstSavingsGoal: () => void
  dismiss: () => void
}

export const useNudgeStore = create<NudgeState & NudgeStoreActions>()(
  persist(
    (set, get) => ({
      hasFirstTransaction: false,
      hasFirstBill: false,
      hasFirstSavingsGoal: false,
      isDismissed: false,

      markFirstTransaction: () => {
        set({ hasFirstTransaction: true })
        checkAllDone(get, set)
      },
      markFirstBill: () => {
        set({ hasFirstBill: true })
        checkAllDone(get, set)
      },
      markFirstSavingsGoal: () => {
        set({ hasFirstSavingsGoal: true })
        checkAllDone(get, set)
      },
      dismiss: () => set({ isDismissed: true }),
    }),
    { name: STORAGE_KEYS.NUDGE_STATE }
  )
)

function checkAllDone(
  get: () => NudgeState,
  set: (partial: Partial<NudgeState>) => void
): void {
  const { hasFirstTransaction, hasFirstBill, hasFirstSavingsGoal } = get()
  if (hasFirstTransaction && hasFirstBill && hasFirstSavingsGoal) {
    set({ isDismissed: true })
  }
}
