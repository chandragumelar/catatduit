// ===== CALC.WORKER.JS — Web Worker untuk kalkulasi berat =====
// Dipanggil dari dashboard.calc.js via WorkerBridge

self.onmessage = function (e) {
  const { id, type, payload } = e.data;
  try {
    let result;
    switch (type) {
      case 'calcDashboard':
        result = _calcDashboard(payload);
        break;
      case 'calcBudgetStatus':
        result = _calcBudgetStatus(payload);
        break;
      case 'calcHealthScore':
        result = _calcHealthScore(payload);
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
  const totalKeluar = bulanIni.filter(t => t.jenis === 'keluar').reduce((s, t) => s + t.nominal, 0);
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
  bulanIni.filter(t => t.jenis === 'keluar').forEach(t => {
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
      keluar: txs.filter(t => t.jenis === 'keluar').reduce((s, t) => s + t.nominal, 0),
      nabung: txs.filter(t => t.jenis === 'nabung').reduce((s, t) => s + t.nominal, 0),
    };
  });
}

// ===== KALKULASI BUDGET =====

function _calcBudgetStatus({ transaksi, budgets, year, month }) {
  if (!budgets || Object.keys(budgets).length === 0) return {};
  const bulanIni = transaksi.filter(tx => tx.jenis === 'keluar' && _isSameMonth(tx.tanggal, year, month));
  const result = {};
  for (const [katId, limit] of Object.entries(budgets)) {
    if (!limit || limit <= 0) continue;
    const used = bulanIni.filter(tx => tx.kategori === katId).reduce((s, tx) => s + tx.nominal, 0);
    const pct = Math.round((used / limit) * 100);
    const status = pct >= 100 ? 'jebol' : pct >= 80 ? 'warning' : 'aman';
    result[katId] = { limit, used, pct, status };
  }
  return result;
}

// ===== KALKULASI HEALTH SCORE =====

function _calcHealthScore({ transaksi, goals, year, month }) {
  const bulanIni = transaksi.filter(tx => _isSameMonth(tx.tanggal, year, month));
  const totalMasuk  = bulanIni.filter(t => t.jenis === 'masuk').reduce((s, t) => s + t.nominal, 0);
  const totalKeluar = bulanIni.filter(t => t.jenis === 'keluar').reduce((s, t) => s + t.nominal, 0);
  const totalNabung = bulanIni.filter(t => t.jenis === 'nabung').reduce((s, t) => s + t.nominal, 0);

  // Komponen 1: Rasio tabungan (25%)
  let c1 = 0;
  if (totalMasuk > 0) {
    const savingRate = totalNabung / totalMasuk;
    c1 = savingRate >= 0.2 ? 100 : savingRate >= 0.1 ? 70 : savingRate > 0 ? 40 : 10;
  }

  // Komponen 2: Konsistensi catat (25%)
  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysPassed = (today.getFullYear() === year && today.getMonth() === month)
    ? today.getDate()
    : daysInMonth;
  const activeDays = new Set(bulanIni.map(tx => tx.tanggal)).size;
  const c2 = daysPassed <= 3 ? 70 : Math.min(100, Math.round((activeDays / daysPassed) * 100));

  // Komponen 3: Surplus/defisit (25%)
  let c3 = 0;
  if (totalMasuk === 0 && totalKeluar === 0) c3 = 70;
  else if (totalMasuk === 0) c3 = 20;
  else {
    const surplus = totalMasuk - totalKeluar;
    const ratio = surplus / totalMasuk;
    c3 = ratio > 0.3 ? 100 : ratio > 0 ? 70 : ratio > -0.2 ? 40 : 10;
  }

  // Komponen 4: Progress goals (25%)
  let c4 = 70; // default jika tidak ada goals
  if (goals && goals.length > 0) {
    const avgProgress = goals.reduce((s, g) => s + Math.min((g.terkumpul || 0) / (g.target || 1), 1), 0) / goals.length;
    c4 = avgProgress >= 0.5 ? 100 : avgProgress >= 0.2 ? 70 : 40;
  }

  const score = Math.round((c1 + c2 + c3 + c4) / 4);
  return { score, c1, c2, c3, c4, totalMasuk, totalKeluar, totalNabung };
}

// ===== UTILS =====

function _isSameMonth(dateStr, year, month) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return d.getFullYear() === year && d.getMonth() === month;
}
