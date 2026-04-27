// migration.v7.ts — tambah field currency ke Goal
// Goal lama tidak punya currency — default ke currency utama user
import { getData, setData } from '../storage.base'
import { STORAGE_KEYS } from '@/constants'

export function migrateV7(): void {
  const goals = getData<any[]>(STORAGE_KEYS.GOALS, [])
  if (goals.length === 0) return

  const baseCurrency = getData<string>(STORAGE_KEYS.CURRENCY, 'IDR')

  const migrated = goals.map(g => ({
    ...g,
    currency: g.currency ?? baseCurrency,
    terkumpul: g.terkumpul ?? 0,
  }))

  setData(STORAGE_KEYS.GOALS, migrated)
}
