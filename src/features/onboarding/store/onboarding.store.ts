import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/core/constants/storage-keys'
import type { OnboardingState } from '@/features/transaction/transaction.types'

interface OnboardingStoreActions {
  complete: (now: string) => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState & OnboardingStoreActions>()(
  persist(
    (set) => ({
      isDone: false,
      completedAt: null,

      complete: (now) => set({ isDone: true, completedAt: now }),
      reset: () => set({ isDone: false, completedAt: null }),
    }),
    { name: STORAGE_KEYS.ONBOARDING_DONE }
  )
)
