// =============================================================================
// CERITA.DATA.JS
// Tanggung jawab: Agregasi data bulanan khusus untuk Cerita Bulan Ini
// Depends on: state.js, storage.js, utils.js, cerita.persona.js
// =============================================================================

// Depends on: cerita.persona.js

const CERITA_MIN_TX = 15;

function calcCeritaData(year, month) {
  const txList  = getTransaksi();
  const txBulan = txList.filter(tx => isSameMonth(tx.tanggal, year, month));
  if (txBulan.length < CERITA_MIN_TX) return { ready: false, txCount: txBulan.length };

  const totalMasuk  = _sum(txBulan, 'masuk');
  const totalKeluar = _sum(txBulan, 'keluar');
  const totalNabung = _sum(txBulan, 'nabung');
  const cashflow    = totalMasuk - totalKeluar;

  const prevDate   = new Date(year, month - 1, 1);
  const prevKeluar = txList
    .filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out' && isSameMonth(tx.tanggal, prevDate.getFullYear(), prevDate.getMonth()))
    .reduce((s, tx) => s + tx.nominal, 0);

  const katTotal  = _buildKatTotal(txBulan);
  const katSorted = Object.entries(katTotal).sort((a, b) => b[1] - a[1]);
  const topKatId  = katSorted[0]?.[0] || null;
  const topKatPct = topKatId && totalKeluar > 0 ? katTotal[topKatId] / totalKeluar : 0;
  const top3      = katSorted.slice(0, 3);

  const hariDalamBulan = new Date(year, month + 1, 0).getDate();
  const hariAdaTx      = new Set(txBulan.map(tx => tx.tanggal)).size;
  const now            = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const hariDenom      = isCurrentMonth ? now.getDate() : hariDalamBulan;
  const konsistensiPct = hariAdaTx / hariDenom;
  const streak         = calcStreak(txList);
  const nama           = getNama();

  const base = {
    totalMasuk, totalKeluar, totalNabung, cashflow, prevKeluar,
    topKatId, topKatPct, top3, katTotal, konsistensiPct,
    hariAdaTx, hariDenom, hariDalamBulan, streak,
    nama, isCurrentMonth, txCount: txBulan.length,
  };

  const persona   = getPersona(base);
  const shareText = buildShareText({ ...base });
  return { ready: true, ...base, persona, shareText };
}

function _sum(txList, jenis) {
  if (jenis === 'keluar') return txList.filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out').reduce((s, tx) => s + tx.nominal, 0);
  return txList.filter(tx => tx.jenis === jenis).reduce((s, tx) => s + tx.nominal, 0);
}

function _buildKatTotal(txBulan) {
  const map = {};
  txBulan.filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out').forEach(tx => {
    map[tx.kategori] = (map[tx.kategori] || 0) + tx.nominal;
  });
  return map;
}

