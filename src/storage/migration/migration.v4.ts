// migration.v4.ts — tambah kategori transfer
import { getData, setData } from '../storage.base'
import { STORAGE_KEYS } from '@/constants'

export function migrateV4(): void {
  const transaksi = getData<any[]>(STORAGE_KEYS.TRANSAKSI, [])
  const migrated = transaksi.map(tx => {
    if (tx.type === 'transfer_out' && !tx.kategori) return { ...tx, kategori: 'transfer_keluar' }
    if (tx.type === 'transfer_in' && !tx.kategori) return { ...tx, kategori: 'transfer_masuk' }
    return tx
  })
  setData(STORAGE_KEYS.TRANSAKSI, migrated)
}
