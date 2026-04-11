// ===== DASHBOARD.INSIGHT.JS — Momen Insight engine =====
// Rule-based, 100% lokal. Fondasi untuk Momen Insight v3.
// Setiap insight punya 2 versi wording, rotate per session (Math.random).

const _insightSeed = Math.random() < 0.5 ? 0 : 1;
function _pick(a, b) { return _insightSeed === 0 ? a : b; }

// Pipeline insight — urutan = prioritas
// Setiap fn menerima calcData, return string atau null kalau tidak cukup data
const INSIGHT_PIPELINE = [

  // --- Hari 1-2: streak & welcome ---
  (d) => {
    const { txList, nama } = d;
    if (txList.length === 0) return null;
    const streak = _calcStreak(txList);
    if (streak >= 3) return _pick(
      `${streak} hari berturut kamu catat. Kebiasaan bagus itu!`,
      `Streak ${streak} hari! Konsistensi ini yang bikin data kamu akurat.`,
    );
    return null;
  },

  // --- Cashflow warning: pengeluaran > pemasukan ---
  (d) => {
    const { totalKeluar, totalMasuk, totalNabung } = d;
    if (totalMasuk === 0 || totalKeluar <= totalMasuk) return null;
    const selisih = totalKeluar - totalMasuk;
    return _pick(
      `Pengeluaran bulan ini ${formatRupiah(selisih)} di atas pemasukan. Masih bisa dikejar.`,
      `Sudah boros ${formatRupiah(selisih)} melebihi pemasukan bulan ini. Pantau terus ya.`,
    );
  },

  // --- Lebih hemat dari bulan lalu ---
  (d) => {
    const { totalKeluar, prevKeluar } = d;
    if (prevKeluar === 0 || totalKeluar === 0) return null;
    const diff = ((totalKeluar - prevKeluar) / prevKeluar) * 100;
    if (diff <= -10) return _pick(
      `Pengeluaran turun ${Math.round(Math.abs(diff))}% dari bulan lalu. Pertahankan!`,
      `Bulan ini lebih hemat ${formatRupiah(prevKeluar - totalKeluar)} dibanding bulan lalu.`,
    );
    return null;
  },

  // --- Pengeluaran naik tapi masih aman ---
  (d) => {
    const { totalKeluar, prevKeluar, cashflow } = d;
    if (prevKeluar === 0) return null;
    const diff = ((totalKeluar - prevKeluar) / prevKeluar) * 100;
    if (diff >= 10 && cashflow >= 0) return _pick(
      `Pengeluaran naik ${Math.round(diff)}% dari bulan lalu, tapi cashflow masih positif.`,
      `Ada kenaikan pengeluaran bulan ini, tapi pemasukan masih menutupi. Aman untuk sekarang.`,
    );
    return null;
  },

  // --- Kategori terboros ---
  (d) => {
    const { borosList, txBulanIni } = d;
    if (borosList.length === 0 || txBulanIni.length < 3) return null;
    const top = borosList[0];
    if (top.badge === 'naik') {
      const k = getKategoriById(top.id, 'keluar');
      return _pick(
        `${k.nama} naik ${top.badgeText} dari bulan lalu — kategori terboros bulan ini.`,
        `Pengeluaran ${k.nama} bulan ini ${formatRupiah(top.val)}, naik ${top.badgeText}.`,
      );
    }
    return null;
  },

  // --- Uang bebas tipis ---
  (d) => {
    const { bebasDipakai, estimasiSaldo } = d;
    if (estimasiSaldo <= 0) return null;
    const pct = bebasDipakai / estimasiSaldo;
    if (pct < 0.1 && pct >= 0) return _pick(
      `Uang bebas tinggal ${formatRupiah(bebasDipakai)}. Hati-hati pengeluaran tak terduga.`,
      `Hampir semua uang sudah teralokasi. Sisa bebas dipakai: ${formatRupiah(bebasDipakai)}.`,
    );
    if (bebasDipakai < 0) return _pick(
      `Uang bebas sudah minus ${formatRupiah(Math.abs(bebasDipakai))}. Mungkin perlu tunda pengeluaran besar.`,
      `Tagihan dan tabungan bulan ini melebihi saldo. Minus ${formatRupiah(Math.abs(bebasDipakai))}.`,
    );
    return null;
  },

  // --- Sudah nabung bulan ini ---
  (d) => {
    const { totalNabung, totalMasuk } = d;
    if (totalNabung === 0 || totalMasuk === 0) return null;
    const pct = Math.round((totalNabung / totalMasuk) * 100);
    if (pct >= 10) return _pick(
      `Sudah nabung ${pct}% dari pemasukan bulan ini. Bagus!`,
      `${formatRupiah(totalNabung)} sudah disisihkan bulan ini — ${pct}% dari pemasukan.`,
    );
    return null;
  },

  // --- Stabil ---
  (d) => {
    const { prevKeluar, totalKeluar } = d;
    if (prevKeluar === 0 || totalKeluar === 0) return null;
    const diff = Math.abs(((totalKeluar - prevKeluar) / prevKeluar) * 100);
    if (diff < 5) return _pick(
      'Pengeluaran stabil bulan ini. Pola keuangan kamu terjaga.',
      'Tidak banyak perubahan dari bulan lalu. Konsisten!',
    );
    return null;
  },

  // --- Budget warning ---
  (_) => {
    try { return getBudgetInsight(); } catch(e) { return null; }
  },

  // --- Sprint B Item 13: Komparasi kategori vs 2 minggu lalu ---
  (d) => {
    const { weeklyKatInsight } = d;
    if (!weeklyKatInsight) return null;
    const { id, pct } = weeklyKatInsight;
    if (Math.abs(pct) < 20) return null;
    const k = getKategoriById(id, 'keluar');
    if (pct > 0) return _pick(
      `${k.nama} minggu ini lebih tinggi ${pct}% dari minggu lalu.`,
      `Pengeluaran ${k.nama} naik ${pct}% dibanding pekan lalu — perlu diperhatikan?`,
    );
    return _pick(
      `${k.nama} turun ${Math.abs(pct)}% dari minggu lalu. Lebih hemat!`,
      `Ada penurunan ${Math.abs(pct)}% di ${k.nama} dibanding pekan lalu.`,
    );
  },

  // --- Sprint B Item 14: Hari paling boros ---
  (d) => {
    const { borosDay } = d;
    if (!borosDay) return null;
    return _pick(
      `Kamu paling boros di hari ${borosDay}. Kalau mau hemat, hari itu yang perlu dijaga.`,
      `Pengeluaran terbesar kamu cenderung terjadi di hari ${borosDay}.`,
    );
  },

  // --- Fallback: selalu ada sesuatu ---
  (d) => {
    const { nama, txList } = d;
    if (txList.length < 3) return _pick(
      `Hai, ${nama}! Makin banyak data, makin akurat gambarannya.`,
      `Catat terus biar kelihatan polanya, ${nama}.`,
    );
    return _pick(
      `Hai, ${nama}! Pantau terus keuanganmu ya.`,
      `Catat rutin tiap hari, ${nama} — data kamu makin berguna.`,
    );
  },
];

function getInsightText(calcData) {
  for (const fn of INSIGHT_PIPELINE) {
    try {
      const result = fn(calcData);
      if (result) return result;
    } catch (e) {
      // jangan biarkan satu insight error bikin dashboard kosong
      continue;
    }
  }
  return 'Catat terus keuanganmu ya!'; // nuclear fallback
}

// Hitung berapa hari berturut-turut user catat (streak)
function _calcStreak(txList) {
  if (!txList.length) return 0;
  const dates = new Set(txList.map(tx => tx.tanggal));
  let streak = 0;
  const d = new Date();
  // mulai dari kemarin kalau hari ini belum ada catatan
  if (!dates.has(getTodayStr())) d.setDate(d.getDate() - 1);
  while (true) {
    const str = d.toISOString().split('T')[0];
    if (!dates.has(str)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
