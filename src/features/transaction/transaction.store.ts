import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction } from '@/features/transaction/transaction.types'
import { STORAGE_KEYS } from '@/core/constants/storage-keys'

interface TransactionState {
  transactions: Transaction[]
}

interface TransactionActions {
  addTransaction: (transaction: Transaction) => void
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => void
  deleteTransaction: (id: string) => void
}

export const useTransactionStore = create<TransactionState & TransactionActions>()(
  persist(
    (set) => ({
      transactions: [],

      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [...state.transactions, transaction],
        })),

      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),
    }),
    { name: STORAGE_KEYS.TRANSACTIONS }
  )
)
