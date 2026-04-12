// =============================================================================
// CALC.WORKER.JS
// Tanggung jawab: Web Worker untuk kalkulasi berat: agregasi bulanan, health score
// Depends on: (none — worker scope, no shared globals)
// =============================================================================

// Dipanggil dari dashboard.calc.js via WorkerBridge

self.onmessage = function (e) {
  const { id, type, payload } = e.data;
  try {
    let result;
    switch (type) {
      case 'calcDashboard':
        result = _calcDashboard(payload);
        break;
      default:
        throw new Error('Unknown task: ' + type);
    }
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err.message });
  }
};

// ===== KALKULASI DASHBOARD =====

function _calcDashboard({ transaksi, year, month, wallets }) {
  const bulanIni = transaksi.filter(tx => _isSameMonth(tx.tanggal, year, month));

  const totalMasuk  = bulanIni.filter(t => t.jenis === 'masuk').reduce((s, t) => s + t.nominal, 0);
  const totalKeluar = bulanIni.filter(t => t.jenis === 'keluar' && t.type !== 'transfer_out').reduce((s, t) => s + t.nominal, 0);
  const totalNabung = bulanIni.filter(t => t.jenis === 'nabung').reduce((s, t) => s + t.nominal, 0);

  // Saldo per wallet
  const saldoMap = {};
  wallets.forEach(w => {
    let s = w.saldo_awal || 0;
    transaksi.forEach(tx => {
      if (tx.wallet_id !== w.id) return;
      if (tx.jenis === 'masuk') s += tx.nominal;
      else if (tx.jenis === 'keluar') s -= tx.nominal;
    });
    saldoMap[w.id] = s;
  });

  // Pengeluaran per kategori bulan ini
  const byKategori = {};
  bulanIni.filter(t => t.jenis === 'keluar' && t.type !== 'transfer_out').forEach(t => {
    byKategori[t.kategori] = (byKategori[t.kategori] || 0) + t.nominal;
  });

  // Data chart 6 bulan terakhir
  const chartData = _buildChartData(transaksi, year, month);

  return { totalMasuk, totalKeluar, totalNabung, saldoMap, byKategori, chartData };
}

function _buildChartData(transaksi, year, month) {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    let m = month - i, y = year;
    if (m < 0) { m += 12; y -= 1; }
    months.push({ year: y, month: m });
  }
  return months.map(({ year: y, month: m }) => {
    const txs = transaksi.filter(tx => _isSameMonth(tx.tanggal, y, m));
    return {
      year: y, month: m,
      masuk:  txs.filter(t => t.jenis === 'masuk').reduce((s, t) => s + t.nominal, 0),
      keluar: txs.filter(t => t.jenis === 'keluar' && t.type !== 'transfer_out').reduce((s, t) => s + t.nominal, 0),
      nabung: txs.filter(t => t.jenis === 'nabung').reduce((s, t) => s + t.nominal, 0),
    };
  });
}

// ===== UTILS =====

function _isSameMonth(dateStr, year, month) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return d.getFullYear() === year && d.getMonth() === month;
}
