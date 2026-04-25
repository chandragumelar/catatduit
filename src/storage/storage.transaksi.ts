// =============================================================================
// storage/storage.transaksi.ts
// =============================================================================

import type { Transaksi } from '@/types'
import { STORAGE_KEYS } from '@/constants'
import { getData, setData } from './storage.base'

export function getTransaksi(): Transaksi[] {
  return getData<Transaksi[]>(STORAGE_KEYS.TRANSAKSI, [])
}

export function saveTransaksi(data: Transaksi[]): boolean {
  return setData(STORAGE_KEYS.TRANSAKSI, data)
}

export function addTransaksi(tx: Transaksi): boolean {
  const existing = getTransaksi()
  return saveTransaksi([...existing, tx])
}

export function updateTransaksi(id: string, patch: Partial<Transaksi>): boolean {
  const existing = getTransaksi()
  return saveTransaksi(existing.map(tx => tx.id === id ? { ...tx, ...patch } : tx))
}

export function deleteTransaksi(id: string): boolean {
  const existing = getTransaksi()
  const tx = existing.find(t => t.id === id)
  // Kalau transfer, hapus pasangannya juga
  if (tx?.group_id) {
    return saveTransaksi(existing.filter(t => t.group_id !== tx.group_id))
  }
  return saveTransaksi(existing.filter(t => t.id !== id))
}

export function addTransferPair(out: import('@/types').Transaksi, ins: import('@/types').Transaksi): boolean {
  const existing = getTransaksi()
  return saveTransaksi([...existing, out, ins])
}
