import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category } from '@/features/transaction/transaction.types'
import { STORAGE_KEYS } from '@/core/constants/storage-keys'
import { DEFAULT_CATEGORIES } from '@/core/constants/categories'

interface CategoryState {
  categories: Category[]
}

interface CategoryActions {
  initDefaultCategories: (now: string) => void
  addCategory: (category: Category) => { success: boolean; error?: string }
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id' | 'createdAt' | 'isDefault'>>) => void
  removeCategory: (id: string) => { success: boolean; error?: string }
}

export const useCategoryStore = create<CategoryState & CategoryActions>()(
  persist(
    (set, get) => ({
      categories: [],

      initDefaultCategories: (now) => {
        const { categories } = get()
        if (categories.length > 0) return

        const defaults: Category[] = DEFAULT_CATEGORIES.map((c) => ({
          ...c,
          createdAt: now,
          updatedAt: now,
        }))
        set({ categories: defaults })
      },

      addCategory: (category) => {
        const { categories } = get()

        const isDuplicate = categories.some(
          (c) =>
            c.name.trim().toLowerCase() === category.name.trim().toLowerCase() &&
            c.type === category.type
        )
        if (isDuplicate) {
          return { success: false, error: 'Nama kategori sudah ada' }
        }

        set({ categories: [...categories, category] })
        return { success: true }
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }))
      },

      removeCategory: (id) => {
        const { categories } = get()
        const category = categories.find((c) => c.id === id)

        if (!category) {
          return { success: false, error: 'Kategori tidak ditemukan' }
        }
        if (category.isDefault) {
          return { success: false, error: 'Kategori bawaan tidak bisa dihapus' }
        }

        set({ categories: categories.filter((c) => c.id !== id) })
        return { success: true }
      },
    }),
    { name: STORAGE_KEYS.CATEGORIES }
  )
)
