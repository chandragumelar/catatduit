// ===== DASHBOARD.CALC.JS — Semua kalkulasi dashboard =====

function calcDashboard() {
  const txList = getTransaksi();
  const { year, month } = getCurrentMonthYear();

  const txBulanIni = txList.filter(tx => isSameMonth(tx.tanggal, year, month));

  const totalMasuk   = txBulanIni.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0);
  const totalKeluar  = txBulanIni.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0);
  const totalNabung  = txBulanIni.filter(tx => tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0);
  const cashflow     = totalMasuk - totalKeluar;

  // Saldo: v3 pakai getSaldoTotal() dari wallet, fallback ke v2 estimasi
  const wallets = getWallets();
  const estimasiSaldo = wallets.length > 0
    ? getSaldoTotal()
    : getSaldoAwal()
      + txList.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0)
      - txList.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0);

  const totalNabungAllTime = txList.filter(tx => tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0);

  // Bulan lalu
  const prevDate  = new Date(year, month - 1, 1);
  const prevYear  = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth();
  const txBulanLalu = txList.filter(tx => isSameMonth(tx.tanggal, prevYear, prevMonth));
  const prevKeluar  = txBulanLalu.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0);

  // Trend pengeluaran
  let trendText = '', trendClass = 'neutral';
  if (prevKeluar > 0) {
    const diff = ((totalKeluar - prevKeluar) / prevKeluar) * 100;
    if (diff > 0)      { trendText = `↑ Naik ${Math.round(diff)}% dari bulan lalu`;           trendClass = 'up'; }
    else if (diff < 0) { trendText = `↓ Turun ${Math.round(Math.abs(diff))}% dari bulan lalu`; trendClass = 'down'; }
    else               { trendText = 'Stabil dari bulan lalu'; }
  }

  // Pace harian
  const hariIni        = new Date().getDate();
  const hariDalamBulan = new Date(year, month + 1, 0).getDate();
  const rataHarian     = hariIni > 0 ? Math.round(totalKeluar / hariIni) : 0;
  const budgetHarian   = totalMasuk > 0 ? Math.round(totalMasuk / hariDalamBulan) : 0;

  // Uang bebas
  const tagihan           = getTagihan();
  const tagihanBulanIni   = tagihan.filter(t => {
    if (!t.jatuhTempo) return false;
    const d = new Date(t.jatuhTempo + 'T00:00:00');
    if (t.isRecurring === false) return d.getFullYear() === year && d.getMonth() === month;
    // Recurring: muncul mulai bulan jatuh tempo pertama
    const currentDate = new Date(year, month, 1);
    const startDate   = new Date(d.getFullYear(), d.getMonth(), 1);
    return currentDate >= startDate;
  });
  const tagihanBelumBayar = tagihanBulanIni.filter(t => !isTagihanPaidThisMonth(t, year, month));
  const tagihanSudahBayar = tagihanBulanIni.filter(t =>  isTagihanPaidThisMonth(t, year, month));
  const totalTagihanBelumBayar = tagihanBelumBayar.reduce((s, t) => s + (t.nominal || 0), 0);
  const uangBebas    = estimasiSaldo - totalTagihanBelumBayar;
  const bebasDipakai = uangBebas - totalNabung;

  // Kategori terboros
  const katBulanIni  = {};
  const katBulanLalu = {};
  txBulanIni.filter(tx => tx.jenis === 'keluar').forEach(tx => {
    katBulanIni[tx.kategori] = (katBulanIni[tx.kategori] || 0) + tx.nominal;
  });
  txBulanLalu.filter(tx => tx.jenis === 'keluar').forEach(tx => {
    katBulanLalu[tx.kategori] = (katBulanLalu[tx.kategori] || 0) + tx.nominal;
  });
  const borosList = Object.entries(katBulanIni)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, val]) => {
      const prevVal = katBulanLalu[id] || 0;
      let badge = 'same', badgeText = 'stabil';
      if (prevVal > 0) {
        const pct = Math.round(((val - prevVal) / prevVal) * 100);
        if (pct > 5)       { badge = 'naik';  badgeText = `↑ ${pct}%`; }
        else if (pct < -5) { badge = 'turun'; badgeText = `↓ ${Math.abs(pct)}%`; }
      }
      return { id, val, badge, badgeText };
    });

  // Pengeluaran per kategori (untuk chart)
  const katTotal = {};
  txBulanIni.filter(tx => tx.jenis === 'keluar').forEach(tx => {
    katTotal[tx.kategori] = (katTotal[tx.kategori] || 0) + tx.nominal;
  });
  const katSorted = Object.entries(katTotal).sort((a, b) => b[1] - a[1]);

  // Rolling 12 bulan (untuk charts)
  const rolling     = getRolling12Months();
  const chartLabels = rolling.map(({ year: y, month: m }) => `${BULAN_NAMES[m].substr(0, 3)} ${String(y).substr(2)}`);
  const chartMasuk  = rolling.map(({ year: y, month: m }) =>
    txList.filter(tx => tx.jenis === 'masuk'  && isSameMonth(tx.tanggal, y, m)).reduce((s, tx) => s + tx.nominal, 0));
  const chartKeluar = rolling.map(({ year: y, month: m }) =>
    txList.filter(tx => tx.jenis === 'keluar' && isSameMonth(tx.tanggal, y, m)).reduce((s, tx) => s + tx.nominal, 0));
  const chartCashflow = chartMasuk.map((m, i) => m - chartKeluar[i]);

  // Check-in hari ini
  const todayStr        = getTodayStr();
  const sudahCatatHariIni = txList.some(tx => tx.tanggal === todayStr);

  // Recent transactions
  const recentTx = [...txList]
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id.localeCompare(a.id))
    .slice(0, 5);

  // Biggest spending bulan ini
  const bigSpending = [...txBulanIni]
    .filter(tx => tx.jenis === 'keluar')
    .sort((a, b) => b.nominal - a.nominal)
    .slice(0, 3);

  return {
    year, month, txList, txBulanIni, txBulanLalu,
    totalMasuk, totalKeluar, totalNabung, cashflow,
    estimasiSaldo, totalNabungAllTime,
    prevKeluar, trendText, trendClass,
    hariIni, hariDalamBulan, rataHarian, budgetHarian,
    tagihan, tagihanBulanIni, tagihanBelumBayar, tagihanSudahBayar,
    totalTagihanBelumBayar, uangBebas, bebasDipakai,
    borosList, katSorted, katTotal,
    rolling, chartLabels, chartMasuk, chartKeluar, chartCashflow,
    sudahCatatHariIni, recentTx, bigSpending,
  };
}
