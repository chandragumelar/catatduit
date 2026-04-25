// =============================================================================
// constants/index.ts
// Nilai yang tidak berubah. Tidak ada logic di sini.
// =============================================================================

import type { KategoriMap } from '@/types'

export const STORAGE_KEYS = {
  ONBOARDING:             'cd_onboarding_done',
  NAMA:                   'cd_nama',
  SALDO_AWAL:             'cd_saldo_awal',        // legacy, migrasi saja
  TRANSAKSI:              'cd_transaksi',
  KATEGORI:               'cd_kategori',
  TAGIHAN:                'cd_tagihan',
  GOALS:                  'cd_goals',
  WALLETS:                'cd_wallets',
  SCHEMA_VERSION:         'cd_schema_v',
  BUDGETS:                'cd_budgets',
  CURRENCY:               'cd_currency',
  NUDGE:                  'cd_nudge_shown',
  CHECKLIST_DISMISSED:    'cd_checklist_dismissed',
  CARD_COLLAPSED:         'cd_card_collapsed',
  SUPPORT_BANNER:         'cd_support_banner_dismissed_at',
  SECONDARY_CURRENCY:     'cd_secondary_currency',
  ACTIVE_CURRENCY_TOGGLE: 'cd_active_currency_toggle',
  MULTICURRENCY_ENABLED:  'cd_multicurrency_enabled',
} as const

export const DEFAULT_WALLET_ID = 'utama'
export const MAX_NOMINAL = 999_000_000_000
export const MAX_GOALS = 5
export const CURRENT_SCHEMA_VERSION = 6
export const SUPPORT_BANNER_COOLDOWN_DAYS = 2

// Kategori ID yang hardcoded — jangan rename
export const HARDCODED_KATEGORI_IDS = [
  'transfer_keluar',
  'transfer_masuk',
  'lainnya_keluar',
  'lainnya_masuk',
  'lainnya_nabung',
  'tabungan',
  'investasi_nabung',
  'dana_darurat',
] as const

export const KATEGORI_DEFAULT: KategoriMap = {
  keluar: [
    { id: 'makan',        nama: 'Makan & Minum',    icon: '🍴' },
    { id: 'transport',    nama: 'Transportasi',      icon: '🚗' },
    { id: 'belanja',      nama: 'Belanja',           icon: '🛒' },
    { id: 'pulsa',        nama: 'Pulsa & Internet',  icon: '📱' },
    { id: 'listrik',      nama: 'Listrik',           icon: '💡' },
    { id: 'air',          nama: 'Air',               icon: '💧' },
    { id: 'rumah',        nama: 'Rumah',             icon: '🏠' },
    { id: 'kesehatan',    nama: 'Kesehatan',         icon: '🏥' },
    { id: 'hiburan',      nama: 'Hiburan',           icon: '🎮' },
    { id: 'pendidikan',   nama: 'Pendidikan',        icon: '📚' },
    { id: 'transfer_keluar', nama: 'Transfer Keluar', icon: '↗️' },
    { id: 'lainnya_keluar',  nama: 'Lainnya',        icon: '📦' },
  ],
  masuk: [
    { id: 'gaji',         nama: 'Gaji',              icon: '💼' },
    { id: 'freelance',    nama: 'Freelance',          icon: '💻' },
    { id: 'bisnis',       nama: 'Bisnis',             icon: '🏪' },
    { id: 'investasi',    nama: 'Hasil Investasi',    icon: '📈' },
    { id: 'transfer_masuk', nama: 'Transfer Masuk',  icon: '↙️' },
    { id: 'lainnya_masuk',  nama: 'Lainnya',         icon: '📦' },
  ],
  nabung: [
    { id: 'tabungan',        nama: 'Tabungan',       icon: '🏦' },
    { id: 'investasi_nabung', nama: 'Investasi',     icon: '📈' },
    { id: 'dana_darurat',    nama: 'Dana Darurat',   icon: '🛡️' },
    { id: 'lainnya_nabung',  nama: 'Lainnya',        icon: '📦' },
  ],
}

export const CURRENCY_OPTIONS = [
  { code: 'IDR', symbol: 'Rp',   label: 'Rupiah — Rp' },
  { code: 'USD', symbol: '$',    label: 'US Dollar — $' },
  { code: 'SGD', symbol: 'S$',   label: 'Singapore Dollar — S$' },
  { code: 'MYR', symbol: 'RM',   label: 'Malaysian Ringgit — RM' },
  { code: 'AUD', symbol: 'A$',   label: 'Australian Dollar — A$' },
  { code: 'EUR', symbol: '€',    label: 'Euro — €' },
  { code: 'GBP', symbol: '£',    label: 'British Pound — £' },
  { code: 'JPY', symbol: '¥',    label: 'Japanese Yen — ¥' },
  { code: 'CNY', symbol: '¥',    label: 'Chinese Yuan — ¥' },
  { code: 'KRW', symbol: '₩',    label: 'Korean Won — ₩' },
] as const
