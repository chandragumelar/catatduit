// =============================================================================
// storage/storage.goals.ts
// =============================================================================

import type { Goal } from '@/types'
import { STORAGE_KEYS, MAX_GOALS } from '@/constants'
import { getData, setData } from './storage.base'

export function getGoals(): Goal[] {
  const goals = getData<Goal[]>(STORAGE_KEYS.GOALS, [])
  return goals.map(g => ({ ...g, terkumpul: g.terkumpul ?? 0 }))
}

export function saveGoals(data: Goal[]): boolean {
  if (data.length > MAX_GOALS) throw new Error(`Maksimal ${MAX_GOALS} tujuan tabungan`)
  return setData(STORAGE_KEYS.GOALS, data)
}
