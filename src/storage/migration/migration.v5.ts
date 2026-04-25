// migration.v5.ts — tambah currency ke Wallet
import { getData, setData } from '../storage.base'
import { STORAGE_KEYS } from '@/constants'

export function migrateV5(): void {
  const wallets = getData<any[]>(STORAGE_KEYS.WALLETS, [])
  const baseCurrency = getData<string>(STORAGE_KEYS.CURRENCY, 'IDR')
  const migrated = wallets.map(w => ({
    currency: baseCurrency,
    ...w,
  }))
  setData(STORAGE_KEYS.WALLETS, migrated)
}
