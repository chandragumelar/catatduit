import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SavingsGoal } from '@/features/transaction/transaction.types'
import { STORAGE_KEYS } from '@/core/constants/storage-keys'

interface SavingsState {
  goals: SavingsGoal[]
}

interface SavingsActions {
  addGoal: (goal: SavingsGoal) => void
  updateGoal: (id: string, updates: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>) => void
  removeGoal: (id: string) => void
}

export const useSavingsStore = create<SavingsState & SavingsActions>()(
  persist(
    (set) => ({
      goals: [],

      addGoal: (goal) => set((s) => ({ goals: [...s.goals, goal] })),

      updateGoal: (id, updates) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
          ),
        })),

      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
    }),
    { name: STORAGE_KEYS.SAVINGS_GOALS }
  )
)
