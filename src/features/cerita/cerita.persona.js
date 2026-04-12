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
    tagline: 'Pelan tapi pasti.',
    match: (d) => d.totalMasuk > 0 && (d.totalNabung / d.totalMasuk) >= 0.20 },
  { id: 'hemat',   icon: '🎯', nama: 'Si Hemat',
    tagline: 'Bulan ini kamu versi lebih baik dari diri sendiri.',
    match: (d) => d.prevKeluar > 0 && ((d.prevKeluar - d.totalKeluar) / d.prevKeluar) >= 0.20 },
  { id: 'foodie',  icon: '🍜', nama: 'Si Foodie',
    tagline: 'Hidup untuk makan, bukan makan untuk hidup.',
    match: (d) => d.topKatId && ['makan'].includes(d.topKatId) },
  { id: 'nomaden', icon: '🛵', nama: 'Si Nomaden',
    tagline: 'Jalannya jauh, tapi kamu pantau terus.',
    match: (d) => d.topKatId && ['transport'].includes(d.topKatId) },
  { id: 'pejuang', icon: '💪', nama: 'Si Pejuang',
    tagline: 'Bulan ini berat, tapi kamu tetap catat.',
    match: (d) => d.cashflow < 0 },
  { id: 'rajin',   icon: '📓', nama: 'Si Rajin',
    tagline: 'Data kamu lebih akurat dari kebanyakan orang.',
    match: (d) => d.konsistensiPct >= 0.80 },
  { id: 'santuy',  icon: '☁️', nama: 'Si Santuy',
    tagline: 'Aman, tapi ada ruang untuk lebih baik.',
    match: (d) => d.cashflow >= 0 && d.totalNabung === 0 },
  { id: 'seimbang',icon: '⚖️', nama: 'Si Seimbang',
    tagline: 'Tidak ada yang terlalu banyak, tidak ada yang terlalu sedikit.',
    match: (d) => d.totalKeluar > 0 && d.topKatPct < 0.40 },
  { id: 'pencatat',icon: '📱', nama: 'Si Pencatat',
    tagline: 'Sudah catat, itu langkah pertama yang paling penting.',
    match: () => true },
];

function getPersona(data) {
  return PERSONAS.find(p => p.match(data)) || PERSONAS[PERSONAS.length - 1];
}

function getPersonaGradient(personaId) {
  return PERSONA_GRADIENTS[personaId] || PERSONA_GRADIENTS.pencatat;
}
