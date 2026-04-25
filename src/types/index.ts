// =============================================================================
// types/index.ts
// Semua TypeScript interfaces & types untuk CatatDuit v4.
// Jangan definisikan type di file feature — taruh di sini.
// =============================================================================

export type TransaksiJenis = 'masuk' | 'keluar' | 'nabung'
export type TransaksiType = 'transfer_out' | 'transfer_in'

export interface Transaksi {
  id: string
  jenis: TransaksiJenis
  nominal: number
  kategori: string           // FK ke Kategori.id
  tanggal: string            // "YYYY-MM-DD"
  catatan: string            // default ""
  wallet_id: string          // FK ke Wallet.id
  timestamp: number          // Date.now()
  // Transfer only — opsional
  type?: TransaksiType
  group_id?: string          // pair transfer, hapus satu harus hapus keduanya
  peer_wallet_id?: string
}

export interface Wallet {
  id: string                 // default wallet = "utama"
  nama: string
  icon: string               // emoji
  saldo_awal: number
  currency: string           // e.g. "IDR"
}

export interface Tagihan {
  id: string
  nama: string
  nominal: number
  tanggal: number            // tanggal jatuh tempo dalam bulan (1–31)
  wallet_id: string
  kategori: string
  isRecurring: boolean       // default true
  paidMonths: string[]       // array "YYYY-MM", append-only
}

export interface Goal {
  id: string
  nama: string
  target: number
  terkumpul: number          // update manual, tidak relasi ke tx nabung
  deadline?: string          // "YYYY-MM-DD"
  icon?: string
}

export interface KategoriItem {
  id: string
  nama: string
  icon: string               // emoji
}

export interface KategoriMap {
  keluar: KategoriItem[]
  masuk: KategoriItem[]
  nabung: KategoriItem[]
}

// Budget per currency per kategori (schema v6)
export type BudgetMap = {
  [currencyCode: string]: {
    [kategoriId: string]: number
  }
}

export type CurrencyToggle = 'base' | 'secondary'

// Computed values — hasil kalkulasi, bukan entity storage
export interface ComputedKeuangan {
  totalSaldo: number
  totalMasuk: number
  totalKeluar: number
  totalTagihan: number
  totalNabung: number
  uangBebas: number
}
