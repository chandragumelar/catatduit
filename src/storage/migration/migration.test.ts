// =============================================================================
// storage/migration/migration.test.ts
// Vitest unit tests untuk semua migration scripts.
// Jalankan: npm test
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { migrateV3 } from './migration.v3'
import { migrateV4 } from './migration.v4'
import { migrateV5 } from './migration.v5'
import { migrateV6 } from './migration.v6'

// Mock localStorage
const store: Record<string, string> = {}
beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k])
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  })
})

describe('migrateV3', () => {
  it('menambahkan wallet_id dan timestamp ke transaksi yang belum punya', () => {
    store['cd_transaksi'] = JSON.stringify([{ id: '1', jenis: 'keluar', nominal: 10000 }])
    migrateV3()
    const result = JSON.parse(store['cd_transaksi'])
    expect(result[0].wallet_id).toBe('utama')
    expect(result[0].timestamp).toBeTypeOf('number')
  })

  it('tidak menimpa wallet_id yang sudah ada', () => {
    store['cd_transaksi'] = JSON.stringify([{ id: '1', wallet_id: 'tabungan', timestamp: 123 }])
    migrateV3()
    const result = JSON.parse(store['cd_transaksi'])
    expect(result[0].wallet_id).toBe('tabungan')
  })

  it('aman dijalankan pada array kosong', () => {
    store['cd_transaksi'] = JSON.stringify([])
    migrateV3()
    expect(JSON.parse(store['cd_transaksi'])).toEqual([])
  })
})

describe('migrateV4', () => {
  it('menambahkan kategori transfer_keluar ke transfer_out yang belum punya kategori', () => {
    store['cd_transaksi'] = JSON.stringify([{ id: '1', type: 'transfer_out' }])
    migrateV4()
    const result = JSON.parse(store['cd_transaksi'])
    expect(result[0].kategori).toBe('transfer_keluar')
  })

  it('tidak menimpa kategori yang sudah ada', () => {
    store['cd_transaksi'] = JSON.stringify([{ id: '1', type: 'transfer_out', kategori: 'custom' }])
    migrateV4()
    const result = JSON.parse(store['cd_transaksi'])
    expect(result[0].kategori).toBe('custom')
  })
})

describe('migrateV5', () => {
  it('menambahkan currency ke wallet dari base currency', () => {
    store['cd_wallets'] = JSON.stringify([{ id: 'utama', nama: 'Dompet Utama' }])
    store['cd_currency'] = JSON.stringify('IDR')
    migrateV5()
    const result = JSON.parse(store['cd_wallets'])
    expect(result[0].currency).toBe('IDR')
  })
})

describe('migrateV6', () => {
  it('mengkonversi budget flat ke format per-currency', () => {
    store['cd_budgets'] = JSON.stringify({ makan: 500000, transport: 300000 })
    store['cd_currency'] = JSON.stringify('IDR')
    migrateV6()
    const result = JSON.parse(store['cd_budgets'])
    expect(result['IDR']).toEqual({ makan: 500000, transport: 300000 })
  })

  it('idempotent — tidak mengubah jika sudah format baru', () => {
    const existing = { IDR: { makan: 500000 } }
    store['cd_budgets'] = JSON.stringify(existing)
    migrateV6()
    expect(JSON.parse(store['cd_budgets'])).toEqual(existing)
  })
})
