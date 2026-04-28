import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Budget } from '@/features/transaction/transaction.types'
import { STORAGE_KEYS } from '@/core/constants/storage-keys'

interface BudgetState {
  budgets: Budget[]
}

interface BudgetActions {
  addBudget: (budget: Budget) => { success: boolean; error?: string }
  updateBudget: (id: string, updates: Partial<Omit<Budget, 'id' | 'createdAt'>>) => void
  removeBudget: (id: string) => void
}

export const useBudgetStore = create<BudgetState & BudgetActions>()(
  persist(
    (set, get) => ({
      budgets: [],

      addBudget: (budget) => {
        const { budgets } = get()
        const duplicate = budgets.find(
          (b) => b.categoryId === budget.categoryId && b.periodType === budget.periodType
        )
        if (duplicate) {
          return { success: false, error: 'Budget untuk kategori ini sudah ada' }
        }
        set({ budgets: [...budgets, budget] })
        return { success: true }
      },

      updateBudget: (id, updates) =>
        set((s) => ({
          budgets: s.budgets.map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
          ),
        })),

      removeBudget: (id) =>
        set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),
    }),
    { name: STORAGE_KEYS.BUDGETS }
  )
)
