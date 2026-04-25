// migration.v3.ts — tambah wallet_id & timestamp ke transaksi lama
import { getData, setData } from '../storage.base'
import { STORAGE_KEYS, DEFAULT_WALLET_ID } from '@/constants'

export function migrateV3(): void {
  const transaksi = getData<any[]>(STORAGE_KEYS.TRANSAKSI, [])
  const migrated = transaksi.map(tx => ({
    wallet_id: DEFAULT_WALLET_ID,
    timestamp: Date.now(),
    catatan: '',
    ...tx,
  }))
  setData(STORAGE_KEYS.TRANSAKSI, migrated)
}
