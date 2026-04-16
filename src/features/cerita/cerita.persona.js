// =============================================================================
// CERITA.PERSONA.JS
// Tanggung jawab: Logika penentuan 9 financial personas dari data transaksi
// Depends on: (none)
// =============================================================================


const PERSONA_GRADIENTS = {
  semut:    ['#065f46', '#059669'],
  hemat:    ['#1e40af', '#3b82f6'],
  foodie:   ['#92400e', '#f59e0b'],
  nomaden:  ['#4c1d95', '#8b5cf6'],
  pejuang:  ['#991b1b', '#ef4444'],
  rajin:    ['#134e4a', '#0d9488'],
  santuy:   ['#374151', '#9ca3af'],
  seimbang: ['#713f12', '#eab308'],
  pencatat: ['#0f4c75', '#0d9488'],
};

const PERSONAS = [
  { id: 'semut',    icon: '🐜', nama: 'Si Semut',
    tagline: 'Dari setiap rupiah yang masuk, kamu sudah sisihkan dulu sebelum sempat kepake. Itu bukan kebetulan — itu kebiasaan yang dibangun pelan-pelan.',
    match: (d) => d.totalMasuk > 0 && (d.totalNabung / d.totalMasuk) >= 0.20 },
  { id: 'hemat',   icon: '🎯', nama: 'Si Hemat',
    tagline: 'Bulan lalu kamu lebih boros, bulan ini kamu koreksi sendiri tanpa disuruh. Improvement kayak gini yang susah diukur tapi nyata dampaknya.',
    match: (d) => d.prevKeluar > 0 && ((d.prevKeluar - d.totalKeluar) / d.prevKeluar) >= 0.20 },
  { id: 'foodie',  icon: '🍜', nama: 'Si Foodie',
    tagline: 'Pengeluaran terbesar kamu bulan ini ada di makanan — dan gue rasa kamu tidak menyesal sama sekali. Selama tercatat, itu keputusan yang disadari.',
    match: (d) => d.topKatId && ['makan'].includes(d.topKatId) },
  { id: 'nomaden', icon: '🛵', nama: 'Si Nomaden',
    tagline: 'Transport jadi pengeluaran terbesar bulan ini. Banyak jalan yang ditempuh — dan semuanya tercatat dengan rapi.',
    match: (d) => d.topKatId && ['transport'].includes(d.topKatId) },
  { id: 'pejuang', icon: '💪', nama: 'Si Pejuang',
    tagline: 'Bulan ini pengeluaran lebih besar dari pemasukan. Bukan kondisi ideal, tapi kamu tidak menutup mata — kamu catat, dan itu modal untuk mulai balik arah.',
    match: (d) => d.cashflow < 0 },
  { id: 'rajin',   icon: '📓', nama: 'Si Rajin',
    tagline: 'Hampir setiap hari ada catatan baru masuk. Orang yang datanya selengkap ini biasanya paling cepat sadar kalau ada yang mulai bergeser di keuangannya.',
    match: (d) => d.konsistensiPct >= 0.80 },
  { id: 'santuy',  icon: '☁️', nama: 'Si Santuy',
    tagline: 'Cashflow kamu positif bulan ini — tidak minus, itu sudah bagus. Belum ada yang disisihkan, tapi setidaknya fondasinya sudah ada untuk mulai.',
    match: (d) => d.totalMasuk > 0 && d.cashflow >= 0 && d.totalNabung === 0 },
  { id: 'seimbang',icon: '⚖️', nama: 'Si Seimbang',
    tagline: 'Tidak ada satu kategori yang mendominasi pengeluaran bulan ini. Kamu spread dengan wajar — dan itu lebih susah dilakukan daripada kedengarannya.',
    match: (d) => d.totalKeluar > 0 && d.topKatPct < 0.40 },
  { id: 'pencatat',icon: '📱', nama: 'Si Pencatat',
    tagline: 'Kamu sudah mulai catat. Di antara semua langkah menuju keuangan yang lebih sehat, langkah pertama ini yang paling sering dilewatin orang lain.',
    match: () => true },
];

function getPersona(data) {
  return PERSONAS.find(p => p.match(data)) || PERSONAS[PERSONAS.length - 1];
}

function getPersonaGradient(personaId) {
  return PERSONA_GRADIENTS[personaId] || PERSONA_GRADIENTS.pencatat;
}
