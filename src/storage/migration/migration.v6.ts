// migration.v6.ts — Budget per-currency (BudgetMap v6)
// Sebelumnya budget adalah { [kategoriId]: number }
// Sekarang: { [currencyCode]: { [kategoriId]: number } }
import { getData, setData } from '../storage.base'
import { STORAGE_KEYS } from '@/constants'

export function migrateV6(): void {
  const raw = getData<any>(STORAGE_KEYS.BUDGETS, null)
  if (!raw) return

  // Kalau sudah format baru (value pertama adalah object), skip
  const firstVal = Object.values(raw)[0]
  if (firstVal && typeof firstVal === 'object' && !Array.isArray(firstVal)) return

  const baseCurrency = getData<string>(STORAGE_KEYS.CURRENCY, 'IDR')
  const migrated = { [baseCurrency]: raw }
  setData(STORAGE_KEYS.BUDGETS, migrated)
}
