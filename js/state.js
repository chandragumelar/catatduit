// ===== STATE.JS — Global state & constants =====

const STORAGE_KEYS = {
  ONBOARDING: 'cd_onboarding_done',
  NAMA: 'cd_nama',
  SALDO_AWAL: 'cd_saldo_awal',
  TRANSAKSI: 'cd_transaksi',
  KATEGORI: 'cd_kategori',
  TAGIHAN: 'cd_tagihan',
  GOALS: 'cd_goals',
  LICENSE: 'cd_license',
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

// Mutable app state
const state = {
  currentPage: 'dashboard',
  inputMode: 'add',
  editingId: null,
  inputJenis: 'keluar',
  inputKategori: null,
  riwayatFilter: { bulan: null, jenis: 'semua' },
  kategoriTab: 'keluar',
  tabunganTab: 'tabungan',
  chartInstances: {},
  // preserve input state when navigating to kategori
  inputPreserve: null,
};
