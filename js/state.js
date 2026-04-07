// ===== STATE.JS — Global state & constants =====

const STORAGE_KEYS = {
  ONBOARDING: 'cd_onboarding_done',
  NAMA: 'cd_nama',
  SALDO_AWAL: 'cd_saldo_awal',  // legacy v2, masih dipakai untuk migration
  TRANSAKSI: 'cd_transaksi',
  KATEGORI: 'cd_kategori',
  TAGIHAN: 'cd_tagihan',
  GOALS: 'cd_goals',
  LICENSE: 'cd_license',
  WALLETS: 'cd_wallets',         // v3 baru
  SCHEMA_VERSION: 'cd_schema_v', // v3 baru — untuk migration guard
  BUDGETS: 'cd_budgets',           // v3 baru — budget per kategori
};

const KATEGORI_DEFAULT = {
  keluar: [
    { id: 'makan', nama: 'Makan & Minum', icon: '🍴' },
    { id: 'transport', nama: 'Transportasi', icon: '🚗' },
    { id: 'belanja', nama: 'Belanja', icon: '🛒' },
    { id: 'pulsa', nama: 'Pulsa & Internet', icon: '📱' },
    { id: 'listrik', nama: 'Listrik', icon: '💡' },
    { id: 'air', nama: 'Air', icon: '💧' },
    { id: 'rumah', nama: 'Rumah', icon: '🏠' },
    { id: 'kesehatan', nama: 'Kesehatan', icon: '🏥' },
    { id: 'subscription', nama: 'Subscription', icon: '📺' },
    { id: 'pendidikan', nama: 'Pendidikan', icon: '📚' },
    { id: 'olahraga', nama: 'Olahraga', icon: '💪' },
    { id: 'perawatan', nama: 'Perawatan Diri', icon: '💅' },
    { id: 'ewallet', nama: 'E-wallet', icon: '💳' },
    { id: 'kartu_kredit', nama: 'Kartu Kredit', icon: '💰' },
    { id: 'cicilan', nama: 'Cicilan', icon: '📋' },
    { id: 'angsuran', nama: 'Angsuran', icon: '🏦' },
    { id: 'kirim_uang', nama: 'Kirim Uang', icon: '📤' },
    { id: 'hotel', nama: 'Hotel', icon: '🏨' },
    { id: 'investasi_keluar', nama: 'Investasi', icon: '📈' },
    { id: 'lainnya_keluar', nama: 'Lainnya', icon: '📦' },
  ],
  masuk: [
    { id: 'gaji', nama: 'Gaji', icon: '💰' },
    { id: 'freelance', nama: 'Freelance', icon: '💻' },
    { id: 'bonus', nama: 'Bonus & THR', icon: '🎁' },
    { id: 'profit_investasi', nama: 'Profit Investasi', icon: '📈' },
    { id: 'bisnis', nama: 'Bisnis / Jualan', icon: '🛍️' },
    { id: 'transfer_masuk', nama: 'Transfer Masuk', icon: '🏦' },
    { id: 'lainnya_masuk', nama: 'Lainnya', icon: '📦' },
  ],
  nabung: [
    { id: 'tabungan', nama: 'Tabungan', icon: '🐷' },
    { id: 'investasi_nabung', nama: 'Investasi', icon: '📊' },
    { id: 'dana_darurat', nama: 'Dana Darurat', icon: '🛡️' },
    { id: 'lainnya_nabung', nama: 'Lainnya', icon: '📦' },
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

const MAX_NOMINAL = 999000000000;
const MAX_GOALS = 5;
const SCHEMA_VERSION = 3;

const DEFAULT_WALLET_ID = 'utama';

const WALLET_PRESETS = [
  { id: 'bca',       nama: 'BCA',        icon: '🏦' },
  { id: 'bri',       nama: 'BRI',        icon: '🏦' },
  { id: 'mandiri',   nama: 'Mandiri',    icon: '🏦' },
  { id: 'bni',       nama: 'BNI',        icon: '🏦' },
  { id: 'gopay',     nama: 'GoPay',      icon: '💚' },
  { id: 'ovo',       nama: 'OVO',        icon: '💜' },
  { id: 'dana',      nama: 'DANA',       icon: '💙' },
  { id: 'shopeepay', nama: 'ShopeePay',  icon: '🧡' },
  { id: 'cash',      nama: 'Cash',       icon: '💵' },
];

// Mutable app state
const state = {
  currentPage: 'dashboard',
  inputMode: 'add',
  editingId: null,
  inputJenis: 'keluar',
  inputKategori: null,
  inputWalletId: null,        // v3: wallet yang dipilih saat input
  selectedWalletId: 'semua', // v3: filter wallet di dashboard
  riwayatFilter: { bulan: null, jenis: 'semua', walletId: 'semua' },
  kategoriTab: 'keluar',
  tabunganTab: 'tabungan',
  chartInstances: {},
  inputPreserve: null,
};

// Budget storage key sudah ada di STORAGE_KEYS via BUDGETS
