// =============================================================================
// CERITA.SHARETEXT.JS
// Tanggung jawab: Generator teks share caption untuk Cerita Bulan Ini
// Depends on: utils.js, cerita.data.js
// =============================================================================


const _seed = Math.random() < 0.5 ? 0 : 1;
function _pick(a, b) { return _seed === 0 ? a : b; }

function buildShareText({ nama, cashflow, prevKeluar, totalKeluar, totalNabung, totalMasuk, isCurrentMonth }) {
  const sfx = isCurrentMonth ? ' (sampai hari ini)' : '';

  if (cashflow > 0 && prevKeluar > 0 && totalKeluar < prevKeluar) {
    const pct = Math.round(((prevKeluar - totalKeluar) / prevKeluar) * 100);
    return _pick(
      `${nama} lebih hemat ${pct}% dari bulan lalu${sfx}. Diam-diam konsisten.`,
      `Pengeluaran turun ${pct}% dari bulan lalu${sfx}. Bukan kebetulan — ini hasil kebiasaan catat.`
    );
  }
  if (totalNabung > 0 && totalMasuk > 0) {
    const pct = Math.round((totalNabung / totalMasuk) * 100);
    return _pick(
      `${pct}% dari pemasukan sudah disisihkan${sfx}. Si Semut memang tidak pernah panik.`,
      `${nama} sisihkan ${_fmtST(totalNabung)} buat nabung${sfx}. Langkah kecil yang berarti.`
    );
  }
  if (cashflow < 0) {
    return _pick(
      `Bulan ini berat. Tapi ${nama} tetap catat, dan itu yang penting${sfx}.`,
      `Pengeluaran melebihi pemasukan ${_fmtST(Math.abs(cashflow))}${sfx}. Bulan depan mulai dari data ini.`
    );
  }
  if (cashflow > 0) {
    return _pick(
      `Cashflow positif ${_fmtST(cashflow)}${sfx}. ${nama} pegang kendali.`,
      `${nama} tutup bulan ini dengan sisa ${_fmtST(cashflow)}${sfx}. Solid.`
    );
  }
  return `${nama} sudah catat keuangan bulan ini. Itu sudah cukup untuk mulai.`;
}

function _fmtST(n) {
  if (n >= 1000000) return (Math.round(n / 100000) / 10).toLocaleString('id-ID') + 'jt';
  if (n >= 1000)    return Math.round(n / 1000).toLocaleString('id-ID') + 'rb';
  return formatRupiah(n);
}
