// =============================================================================
// storage/storage.budget.ts
// =============================================================================

import type { BudgetMap } from '@/types'
import { STORAGE_KEYS } from '@/constants'
import { getData, setData } from './storage.base'

export function getBudgets(): BudgetMap {
  return getData<BudgetMap>(STORAGE_KEYS.BUDGETS, {})
}

export function saveBudgets(data: BudgetMap): boolean {
  return setData(STORAGE_KEYS.BUDGETS, data)
}

