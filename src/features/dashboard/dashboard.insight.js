// =============================================================================
// DASHBOARD.INSIGHT.JS
// Tanggung jawab: Momen Insight engine — 8 rules deteksi pola keuangan
// Depends on: state.js, storage.js, utils.js
// =============================================================================

// Rule-based, 100% lokal.
// Seed berbasis tanggal → ganti tiap hari, konsisten dalam satu sesi.

const _insightSeed = new Date().getDate(); // 1–31
function _pick(...variants) {
  return variants[_insightSeed % variants.length];
}

const INSIGHT_PIPELINE = [

  // --- Streak ---
  (d) => {
    const { txList } = d;
    if (txList.length === 0) return null;
    const streak = calcStreak(txList);
    if (streak >= 3) return _pick(
      `${streak} hari berturut kamu catat. Kebiasaan bagus itu!`,
      `Streak ${streak} hari! Konsistensi ini yang bikin data kamu akurat.`,
      `${streak} hari streak! Jangan rusak sekarang ya bestie.`,
      `Lo udah catat ${streak} hari berturut. Nggak ada yang bisa stop lo.`,
      `Streak ${streak} hari — ini level dedication yang serius.`,
      `${streak} hari nggak miss. Keuangan lo makin terbaca polanya.`,
      `Udah ${streak} hari disiplin catat. Salut fr.`,
    );
    return null;
  },

  // --- Cashflow warning: pengeluaran > pemasukan ---
  (d) => {
    const { totalKeluar, totalMasuk } = d;
    if (totalMasuk === 0 || totalKeluar <= totalMasuk) return null;
    const selisih = totalKeluar - totalMasuk;
    return _pick(
      `Pengeluaran bulan ini ${formatRupiah(selisih)} di atas pemasukan. Masih bisa dikejar.`,
      `Sudah boros ${formatRupiah(selisih)} melebihi pemasukan bulan ini. Pantau terus ya.`,
      `Minus ${formatRupiah(selisih)} dari pemasukan. This ain't it chief.`,
      `Pengeluaran udah ngalahin pemasukan ${formatRupiah(selisih)}. Rem dulu.`,
      `Cashflow bulan ini merah ${formatRupiah(selisih)}. Masih ada waktu buat recovery.`,
      `Lo udah overspend ${formatRupiah(selisih)} bulan ini. Evaluate dulu yuk.`,
      `${formatRupiah(selisih)} di atas pemasukan. Keuangan butuh perhatian ekstra sekarang.`,
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
      `Turun ${Math.round(Math.abs(diff))}% dari bulan lalu. Glow up keuangan detected.`,
      `Lo hemat ${formatRupiah(prevKeluar - totalKeluar)} dibanding bulan kemarin. Keren bgt.`,
      `${Math.round(Math.abs(diff))}% lebih hemat dari bulan lalu. Pola bagus nih.`,
      `Pengeluaran lo drop ${Math.round(Math.abs(diff))}%. Ini progress yang nyata.`,
      `Bulan ini lo jauh lebih irit. Hemat ${formatRupiah(prevKeluar - totalKeluar)} nggak main-main.`,
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
      `Belanja naik ${Math.round(diff)}%, tapi masih hijau. Tetap keep an eye ya.`,
      `Pengeluaran nambah ${Math.round(diff)}% — cashflow masih oke, tapi jangan kebiasaan.`,
      `Naik ${Math.round(diff)}% dari bulan lalu, untungnya pemasukan masih nutup. Noted.`,
      `Agak lebih boros bulan ini, tapi belum bahaya. Stay conscious aja.`,
    );
    return null;
  },

  // --- Kategori terboros naik ---
  (d) => {
    const { borosList, txBulanIni } = d;
    if (borosList.length === 0 || txBulanIni.length < 3) return null;
    const top = borosList[0];
    if (top.badge === 'naik') {
      const k = getKategoriById(top.id, 'keluar');
      return _pick(
        `${k.nama} naik ${top.badgeText} dari bulan lalu — kategori terboros bulan ini.`,
        `Pengeluaran ${k.nama} bulan ini ${formatRupiah(top.val)}, naik ${top.badgeText}.`,
        `${k.nama} lo naik ${top.badgeText}. Ini yang paling nguras bulan ini.`,
        `Kategori ${k.nama} lagi on fire — naik ${top.badgeText} dari bulan lalu.`,
        `${k.nama} jadi biang kerok bulan ini. Naik ${top.badgeText}.`,
        `Hati-hati sama ${k.nama} — udah naik ${top.badgeText} bulan ini.`,
      );
    }
    return null;
  },

  // --- Uang bebas tipis atau minus ---
  (d) => {
    const { bebasDipakai, estimasiSaldo } = d;
    if (estimasiSaldo <= 0) return null;
    const pct = bebasDipakai / estimasiSaldo;
    if (pct < 0.1 && pct >= 0) return _pick(
      `Uang bebas tinggal ${formatRupiah(bebasDipakai)}. Hati-hati pengeluaran tak terduga.`,
      `Hampir semua uang sudah teralokasi. Sisa bebas dipakai: ${formatRupiah(bebasDipakai)}.`,
      `Uang bebas lo tinggal ${formatRupiah(bebasDipakai)}. Tipis banget, careful.`,
      `${formatRupiah(bebasDipakai)} doang sisa uang bebas lo. Jangan impulsif dulu.`,
      `Hampir habis tuh ruang maneuver lo — ${formatRupiah(bebasDipakai)} tersisa.`,
      `Uang bebas mepet banget nih. ${formatRupiah(bebasDipakai)} doang. Stay strong.`,
    );
    if (bebasDipakai < 0) return _pick(
      `Uang bebas sudah minus ${formatRupiah(Math.abs(bebasDipakai))}. Mungkin perlu tunda pengeluaran besar.`,
      `Tagihan dan tabungan bulan ini melebihi saldo. Minus ${formatRupiah(Math.abs(bebasDipakai))}.`,
      `Uang bebas lo udah minus ${formatRupiah(Math.abs(bebasDipakai))}. Red flag nih.`,
      `Minus ${formatRupiah(Math.abs(bebasDipakai))} di uang bebas. Tunda dulu yang nggak urgent.`,
      `Keuangan lagi tight — uang bebas minus ${formatRupiah(Math.abs(bebasDipakai))}. Sabar.`,
      `Ini saatnya pause dulu dari belanja. Minus ${formatRupiah(Math.abs(bebasDipakai))}.`,
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
      `Udah nabung ${pct}% bulan ini. Lumayan bgt ngl.`,
      `${pct}% dari pemasukan udah aman di tabungan. Keep it up bestie.`,
      `Lo udah sisihkan ${formatRupiah(totalNabung)} — ${pct}% dari yang masuk. Proud of u.`,
      `Nabung ${pct}% bulan ini. Future lo bakal berterima kasih.`,
      `${formatRupiah(totalNabung)} udah aman. ${pct}% dari pemasukan — nggak semua orang bisa.`,
      `Udah disisihkan ${pct}% buat masa depan. This is the way.`,
    );
    return null;
  },

  // --- Pengeluaran stabil ---
  (d) => {
    const { prevKeluar, totalKeluar } = d;
    if (prevKeluar === 0 || totalKeluar === 0) return null;
    const diff = Math.abs(((totalKeluar - prevKeluar) / prevKeluar) * 100);
    if (diff < 5) return _pick(
      'Pengeluaran stabil bulan ini. Pola keuangan kamu terjaga.',
      'Tidak banyak perubahan dari bulan lalu. Konsisten!',
      'Pengeluaran lo stabil. Predictable itu underrated.',
      'Pola keuangan lo konsisten. Ini yang bikin planning jadi gampang.',
      'Stabil dari bulan lalu. Tenang, terkontrol — nice.',
      'Nggak banyak drama di keuangan lo bulan ini. Bagus.',
    );
    return null;
  },

  // --- Budget warning ---
  (_) => {
    try { return getBudgetInsight(); } catch(e) { return null; }
  },

  // --- Komparasi kategori vs minggu lalu ---
  (d) => {
    const { weeklyKatInsight } = d;
    if (!weeklyKatInsight) return null;
    const { id, pct } = weeklyKatInsight;
    if (Math.abs(pct) < 20) return null;
    const k = getKategoriById(id, 'keluar');
    if (pct > 0) return _pick(
      `${k.nama} minggu ini lebih tinggi ${pct}% dari minggu lalu.`,
      `Pengeluaran ${k.nama} naik ${pct}% dibanding pekan lalu — perlu diperhatikan?`,
      `${k.nama} lo naik ${pct}% minggu ini. Check your habit.`,
      `Ada lonjakan ${pct}% di ${k.nama} minggu ini. Worth noting.`,
    );
    return _pick(
      `${k.nama} turun ${Math.abs(pct)}% dari minggu lalu. Lebih hemat!`,
      `Ada penurunan ${Math.abs(pct)}% di ${k.nama} dibanding pekan lalu.`,
      `${k.nama} turun ${Math.abs(pct)}% minggu ini. Good job.`,
      `Lo lebih hemat ${Math.abs(pct)}% di ${k.nama} minggu ini. Progress!`,
    );
  },

  // --- Hari paling boros ---
  (d) => {
    const { borosDay } = d;
    if (!borosDay) return null;
    return _pick(
      `Kamu paling boros di hari ${borosDay}. Kalau mau hemat, hari itu yang perlu dijaga.`,
      `Pengeluaran terbesar kamu cenderung terjadi di hari ${borosDay}.`,
      `Hari ${borosDay} tuh bahaya buat dompet lo. Watch out.`,
      `Data bilang hari ${borosDay} paling nguras. Mungkin kurangi jajan hari itu?`,
      `Setiap hari ${borosDay} kayaknya dompet lo on edge. Stay aware.`,
      `Pattern detected: hari ${borosDay} selalu bikin pengeluaran naik.`,
    );
  },

  // --- Rolling 2-week insight ---
  (d) => {
    if (typeof getRollingInsightText !== 'function') return null;
    return getRollingInsightText(d.txList);
  },

  // --- Fallback ---
  (d) => {
    const { nama, txList } = d;
    if (txList.length < 3) return _pick(
      `Hai, ${nama}! Makin banyak data, makin akurat gambarannya.`,
      `Catat terus biar kelihatan polanya, ${nama}.`,
      `${nama}, data lo masih sedikit — makin rajin catat, makin jelas insight-nya.`,
      `Yuk mulai rutin catat, ${nama}. Biar CatatDuit bisa bantu lebih.`,
    );
    return _pick(
      `Hai, ${nama}! Pantau terus keuanganmu ya.`,
      `Catat rutin tiap hari, ${nama} — data kamu makin berguna.`,
      `${nama}, keuangan lo makin terbaca. Lanjutin aja.`,
      `Keep going, ${nama}. Disiplin catat itu investasi juga.`,
      `${nama}, lo udah on the right track. Tinggal konsisten.`,
    );
  },
];

function getInsightText(calcData) {
  for (const fn of INSIGHT_PIPELINE) {
    try {
      const result = fn(calcData);
      if (result) return result;
    } catch (e) {
      continue;
    }
  }
  return 'Catat terus keuanganmu ya!';
}

