import type { Clock } from '@/core/clock/Clock'
import { RealClock } from '@/core/clock/RealClock'
import { useCategoryStore } from '@/features/transaction/category.store'
import { isNonEmptyString } from '@/core/utils/validation'
import type { Category } from '@/features/transaction/transaction.types'

interface CreateCategoryInput {
  name: string
  icon: string
  type: 'expense' | 'income'
}

export function useCategory(clock: Clock = new RealClock()) {
  const { categories, initDefaultCategories, addCategory, updateCategory, removeCategory } =
    useCategoryStore()

  const init = () => {
    initDefaultCategories(clock.now().toISOString())
  }

  const getByType = (type: 'expense' | 'income'): Category[] => {
    return categories.filter((c) => c.type === type)
  }

  const getById = (id: string): Category | undefined => {
    return categories.find((c) => c.id === id)
  }

  const create = (input: CreateCategoryInput): { success: boolean; error?: string } => {
    if (!isNonEmptyString(input.name)) {
      return { success: false, error: 'Nama kategori tidak boleh kosong' }
    }
    if (input.name.trim().length > 30) {
      return { success: false, error: 'Nama kategori maksimal 30 karakter' }
    }
    if (!isNonEmptyString(input.icon)) {
      return { success: false, error: 'Pilih ikon kategori' }
    }

    const now = clock.now().toISOString()
    const category: Category = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      icon: input.icon,
      type: input.type,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    }

    return addCategory(category)
  }

  const update = (
    id: string,
    input: Partial<CreateCategoryInput>
  ): { success: boolean; error?: string } => {
    if (input.name !== undefined) {
      if (!isNonEmptyString(input.name)) {
        return { success: false, error: 'Nama kategori tidak boleh kosong' }
      }
      if (input.name.trim().length > 30) {
        return { success: false, error: 'Nama kategori maksimal 30 karakter' }
      }
    }

    updateCategory(id, {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.icon ? { icon: input.icon } : {}),
    })
    return { success: true }
  }

  const remove = (id: string) => removeCategory(id)

  return {
    categories,
    init,
    getByType,
    getById,
    create,
    update,
    remove,
  }
}
