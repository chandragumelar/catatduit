// =============================================================================
// CERITA.SHARETEXT.JS
// Tanggung jawab: Generator teks share caption untuk Cerita Bulan Ini
// Depends on: utils.js, cerita.data.js
// Bug fix: share text sekarang menerima personaId dan narasi sinkron dengan persona
// =============================================================================


const _seed = Math.random() < 0.5 ? 0 : 1;
function _pick(a, b) { return _seed === 0 ? a : b; }

function buildShareText({ nama, cashflow, prevKeluar, totalKeluar, totalNabung, totalMasuk, isCurrentMonth, persona }) {
  const sfx = isCurrentMonth ? ' (sampai hari ini)' : '';
  const pid  = persona?.id || null;

  // Narasi share selaras dengan persona yang sudah dipilih
  if (pid === 'semut') {
    const pct = totalMasuk > 0 ? Math.round((totalNabung / totalMasuk) * 100) : 0;
    return _pick(
      `${pct}% dari pemasukan sudah disisihkan${sfx}. Diam-diam, Si Semut tidak pernah lupa.`,
      `${nama} nabung ${_fmtST(totalNabung)} bulan ini${sfx}. Konsisten lebih kuat dari motivasi.`
    );
  }
  if (pid === 'hemat') {
    const pct = prevKeluar > 0 ? Math.round(((prevKeluar - totalKeluar) / prevKeluar) * 100) : 0;
    return _pick(
      `${nama} potong pengeluaran ${pct}% dari bulan lalu${sfx}. Bukan kebetulan — ini hasil kebiasaan catat.`,
      `Pengeluaran turun ${pct}% dibanding bulan lalu${sfx}. Diam-diam konsisten.`
    );
  }
  if (pid === 'foodie') {
    return _pick(
      `Porsi terbesar bulan ini? Makanan. Dan ${nama} tidak menyesal${sfx}.`,
      `Si Foodie tahu bahwa pengeluaran yang disadari bukan pemborosan${sfx}.`
    );
  }
  if (pid === 'nomaden') {
    return _pick(
      `Banyak jarak yang ditempuh bulan ini${sfx} — dan semuanya tercatat.`,
      `Transport jadi pengeluaran terbesar ${nama} bulan ini${sfx}. Jalan terus, catat terus.`
    );
  }
  if (pid === 'pejuang') {
    return _pick(
      `Bulan ini tidak mudah — cashflow minus ${_fmtST(Math.abs(cashflow))}${sfx}. Tapi ${nama} tetap catat, dan itu yang jadi titik balik.`,
      `Pengeluaran melebihi pemasukan bulan ini${sfx}. Datanya sudah ada — bulan depan tinggal koreksi.`
    );
  }
  if (pid === 'rajin') {
    return _pick(
      `${nama} catat hampir setiap hari bulan ini${sfx}. Data selengkap ini yang bikin keputusan keuangan lebih tajam.`,
      `Konsistensi catat bulan ini solid${sfx}. Orang yang tahu datanya sendiri selalu selangkah lebih siap.`
    );
  }
  if (pid === 'santuy') {
    return _pick(
      `Cashflow positif${sfx} — tidak minus itu sudah bagus. ${nama} tinggal tambah satu langkah lagi: sisihkan sebagian.`,
      `Bulan ini aman${sfx}. Fondasinya sudah ada, tinggal mulai eksperimen kecil-kecilan.`
    );
  }
  if (pid === 'seimbang') {
    return _pick(
      `Tidak ada kategori yang meledak bulan ini${sfx}. ${nama} belanja dengan sadar — dan itu lebih susah dari yang keliatan.`,
      `Pengeluaran tersebar merata bulan ini${sfx}. Seimbang bukan berarti datar — itu kontrol.`
    );
  }
  // fallback: pencatat
  return _pick(
    `${nama} sudah mulai catat keuangan bulan ini${sfx}. Langkah pertama yang paling sering dilewatin orang lain.`,
    `Catat dulu, analisis belakangan${sfx}. ${nama} sudah di jalur yang benar.`
  );
}

function _fmtST(n) {
  if (n >= 1000000) return (Math.round(n / 100000) / 10).toLocaleString('id-ID') + 'jt';
  if (n >= 1000)    return Math.round(n / 1000).toLocaleString('id-ID') + 'rb';
  return formatRupiah(n);
}
