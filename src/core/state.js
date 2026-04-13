// =============================================================================
// STATE.JS
// Tanggung jawab: Konstanta global, STORAGE_KEYS, KATEGORI_DEFAULT, objek state runtime
// Depends on: (none)
// =============================================================================


const STORAGE_KEYS = {
  ONBOARDING: 'cd_onboarding_done',
  NAMA: 'cd_nama',
  SALDO_AWAL: 'cd_saldo_awal',
  TRANSAKSI: 'cd_transaksi',
  KATEGORI: 'cd_kategori',
  TAGIHAN: 'cd_tagihan',
  GOALS: 'cd_goals',
  WALLETS: 'cd_wallets',
  SCHEMA_VERSION: 'cd_schema_v',
  BUDGETS: 'cd_budgets',
  CURRENCY: 'cd_currency',
  NUDGE: 'cd_nudge_shown',
  CHECKLIST_DISMISSED: 'cd_checklist_dismissed',
  // Sprint B2
  BUDGET_PERIOD:  'cd_budget_period',   // 'monthly' | 'weekly'
  CARD_COLLAPSED: 'cd_card_collapsed',  // array of card ids yang di-collapse
  SUPPORT_BANNER: 'cd_support_banner_dismissed_at', // timestamp dismiss terakhir
  // Multicurrency
  SECONDARY_CURRENCY:     'cd_secondary_currency',      // kode currency kedua, null jika single
  EXCHANGE_RATE:          'cd_exchange_rate',           // rate: 1 secondary = X base
  ACTIVE_CURRENCY_TOGGLE: 'cd_active_currency_toggle',  // 'base' | 'secondary'
  MULTICURRENCY_ENABLED:  'cd_multicurrency_enabled',   // boolean
};

const CURRENCY_OPTIONS = [
  { code: 'IDR', symbol: 'Rp',  label: 'Rupiah — Rp' },
  { code: 'USD', symbol: '$',   label: 'US Dollar — $' },
  { code: 'SGD', symbol: 'S$',  label: 'Singapore Dollar — S$' },
  { code: 'MYR', symbol: 'RM',  label: 'Malaysian Ringgit — RM' },
  { code: 'AUD', symbol: 'A$',  label: 'Australian Dollar — A$' },
  { code: 'EUR', symbol: '€',   label: 'Euro — €' },
  { code: 'GBP', symbol: '£',   label: 'British Pound — £' },
  { code: 'JPY', symbol: '¥',   label: 'Japanese Yen — ¥' },
  { code: 'CNY', symbol: '¥',   label: 'Chinese Yuan — ¥' },
  { code: 'KRW', symbol: '₩',   label: 'Korean Won — ₩' },
  { code: 'HKD', symbol: 'HK$', label: 'Hong Kong Dollar — HK$' },
  { code: 'TWD', symbol: 'NT$', label: 'Taiwan Dollar — NT$' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham — د.إ' },
  { code: 'SAR', symbol: 'SR',  label: 'Saudi Riyal — SR' },
  { code: 'NZD', symbol: 'NZ$', label: 'New Zealand Dollar — NZ$' },
  { code: 'CHF', symbol: 'Fr',  label: 'Swiss Franc — Fr' },
  { code: 'CAD', symbol: 'C$',  label: 'Canadian Dollar — C$' },
];

const KATEGORI_DEFAULT = {
  keluar: [
    { id: 'makan',           nama: 'Makan & Minum',    icon: '🍴' },
    { id: 'transport',       nama: 'Transportasi',     icon: '🚗' },
    { id: 'belanja',         nama: 'Belanja',          icon: '🛒' },
    { id: 'pulsa',           nama: 'Pulsa & Internet', icon: '📱' },
    { id: 'listrik',         nama: 'Listrik',          icon: '💡' },
    { id: 'air',             nama: 'Air',              icon: '💧' },
    { id: 'rumah',           nama: 'Rumah',            icon: '🏠' },
    { id: 'kesehatan',       nama: 'Kesehatan',        icon: '🏥' },
    { id: 'subscription',   nama: 'Subscription',     icon: '📺' },
    { id: 'pendidikan',      nama: 'Pendidikan',       icon: '📚' },
    { id: 'olahraga',        nama: 'Olahraga',         icon: '💪' },
    { id: 'perawatan',       nama: 'Perawatan Diri',   icon: '💅' },
    { id: 'ewallet',         nama: 'E-wallet',         icon: '💳' },
    { id: 'kartu_kredit',    nama: 'Kartu Kredit',     icon: '💰' },
    { id: 'cicilan',         nama: 'Cicilan',          icon: '📋' },
    { id: 'angsuran',        nama: 'Angsuran',         icon: '🏦' },
    { id: 'kirim_uang',      nama: 'Kirim Uang',       icon: '📤' },
    { id: 'hotel',           nama: 'Hotel',            icon: '🏨' },
    { id: 'investasi_keluar',nama: 'Investasi',        icon: '📈' },
    { id: 'transfer_keluar', nama: 'Transfer Keluar',  icon: '↗️' }, // Sprint B2 #17
    { id: 'lainnya_keluar',  nama: 'Lainnya',          icon: '📦' },
  ],
  masuk: [
    { id: 'gaji',            nama: 'Gaji',             icon: '💰' },
    { id: 'freelance',       nama: 'Freelance',        icon: '💻' },
    { id: 'bonus',           nama: 'Bonus & THR',      icon: '🎁' },
    { id: 'profit_investasi',nama: 'Profit Investasi', icon: '📈' },
    { id: 'bisnis',          nama: 'Bisnis / Jualan',  icon: '🛍️' },
    { id: 'transfer_masuk',  nama: 'Transfer Masuk',   icon: '↙️' }, // Sprint B2 #17
    { id: 'lainnya_masuk',   nama: 'Lainnya',          icon: '📦' },
  ],
  nabung: [
    { id: 'tabungan',        nama: 'Tabungan',         icon: '🐷' },
    { id: 'investasi_nabung',nama: 'Investasi',        icon: '📊' },
    { id: 'dana_darurat',    nama: 'Dana Darurat',     icon: '🛡️' },
    { id: 'lainnya_nabung',  nama: 'Lainnya',          icon: '📦' },
  ],
};

const CHART_COLORS = [
  '#0D9488','#3B82F6','#8B5CF6','#EC4899',
  '#F59E0B','#10B981','#EF4444','#6366F1','#14B8A6','#F97316',
];

const BULAN_NAMES = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

const MAX_NOMINAL    = 999000000000;
const MAX_GOALS      = 5;
const SCHEMA_VERSION = 6; // Multicurrency support

// Sprint B2 #16: Dashboard card IDs
const DASHBOARD_CARDS = {
  GREETING:        'card-greeting',
  KEUANGAN:        'card-keuangan',
  HEALTH:          'card-health',
  CERITA:          'card-cerita',
  CHECKIN:         'card-checkin',
  VELOCITY:        'card-velocity',
  CASHFLOW:        'card-cashflow',
  BUDGET:          'card-budget',
  CHARTS:          'card-charts',
  BOROS:           'card-boros',
  RECENT:          'card-recent',
  ROLLING_INSIGHT: 'card-rolling-insight', // Sprint C #19
  SUPPORT:         'card-support',
};

const DEFAULT_WALLET_ID = 'utama';

const WALLET_PRESETS = [
  { id: 'bca',       nama: 'BCA',       icon: '🏦', lucideIcon: 'landmark' },
  { id: 'bri',       nama: 'BRI',       icon: '🏦', lucideIcon: 'landmark' },
  { id: 'mandiri',   nama: 'Mandiri',   icon: '🏦', lucideIcon: 'landmark' },
  { id: 'bni',       nama: 'BNI',       icon: '🏦', lucideIcon: 'landmark' },
  { id: 'gopay',     nama: 'GoPay',     icon: '💚', lucideIcon: 'zap' },
  { id: 'ovo',       nama: 'OVO',       icon: '💜', lucideIcon: 'circle-dollar-sign' },
  { id: 'dana',      nama: 'DANA',      icon: '💙', lucideIcon: 'shield' },
  { id: 'shopeepay', nama: 'ShopeePay', icon: '🧡', lucideIcon: 'shopping-bag' },
  { id: 'cash',      nama: 'Cash',      icon: '💵', lucideIcon: 'banknote' },
];

const state = {
  currentPage:      'dashboard',
  inputMode:        'add',
  editingId:        null,
  inputJenis:       'keluar',
  inputKategori:    null,
  inputWalletId:    null,
  selectedWalletId: 'semua',
  riwayatFilter:    { bulan: null, jenis: 'semua', walletId: 'semua', search: '' },
  kategoriTab:      'keluar',
  tabunganTab:      'tabungan',
  chartInstances:   {},
  inputPreserve:    null,
  fromOnboarding:   false,
  // Multicurrency runtime — tidak perlu persist, diambil dari storage saat init
  activeCurrencyToggle: 'base', // 'base' | 'secondary'
};
