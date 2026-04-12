// ===== DASHBOARD.CALC.JS — Semua kalkulasi dashboard =====

function calcDashboard() {
  const txList = getTransaksi();
  const { year, month } = getCurrentMonthYear();

  const txBulanIni = txList.filter(tx => isSameMonth(tx.tanggal, year, month));

  const totalMasuk   = txBulanIni.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0);
  const totalKeluar  = txBulanIni.filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out').reduce((s, tx) => s + tx.nominal, 0);
  const totalNabung  = txBulanIni.filter(tx => tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0);
  const cashflow     = totalMasuk - totalKeluar;

  // Saldo: v3 pakai getSaldoTotal() dari wallet, fallback ke v2 estimasi
  const wallets = getWallets();
  const estimasiSaldo = wallets.length > 0
    ? getSaldoTotal()
    : getSaldoAwal()
      + txList.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0)
      - txList.filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out').reduce((s, tx) => s + tx.nominal, 0);

  const totalNabungAllTime = txList.filter(tx => tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0);

  // Bulan lalu
  const prevDate  = new Date(year, month - 1, 1);
  const prevYear  = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth();
  const txBulanLalu = txList.filter(tx => isSameMonth(tx.tanggal, prevYear, prevMonth));
  const prevKeluar  = txBulanLalu.filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out').reduce((s, tx) => s + tx.nominal, 0);

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
  txBulanIni.filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out').forEach(tx => {
    katBulanIni[tx.kategori] = (katBulanIni[tx.kategori] || 0) + tx.nominal;
  });
  txBulanLalu.filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out').forEach(tx => {
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
  txBulanIni.filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out').forEach(tx => {
    katTotal[tx.kategori] = (katTotal[tx.kategori] || 0) + tx.nominal;
  });
  const katSorted = Object.entries(katTotal).sort((a, b) => b[1] - a[1]);

  // === SPRINT B ===

  // Item 12: Spending velocity alert
  // Persen budget terpakai vs persen hari terpakai
  const dayPct    = hariIni / hariDalamBulan; // misal 0.33 = hari ke-10 dari 30
  const spendPct  = totalMasuk > 0 ? totalKeluar / totalMasuk : 0;
  const velocityAlert = (totalMasuk > 0 && dayPct > 0.05 && spendPct > dayPct + 0.15)
    ? {
        spendPct: Math.round(spendPct * 100),
        dayPct:   Math.round(dayPct * 100),
        hariIni,
        hariDalamBulan,
      }
    : null;

  // Item 13: Rule-based insight 2 minggu per kategori
  // Bandingkan total pengeluaran per kategori minggu ini vs 2 minggu lalu
  const today      = new Date();
  const msPerDay   = 86400000;
  const startMingguIni   = new Date(today.getTime() - 6 * msPerDay); // 7 hari terakhir
  const startMingguLalu  = new Date(today.getTime() - 13 * msPerDay); // 7-14 hari lalu
  const endMingguLalu    = new Date(today.getTime() - 7 * msPerDay);

  const katMingguIni  = {};
  const katMingguLalu = {};
  txList.forEach(tx => {
    if (tx.jenis !== 'keluar' || tx.type === 'transfer_out') return;
    const d = new Date(tx.tanggal + 'T00:00:00');
    if (d >= startMingguIni)  katMingguIni[tx.kategori]  = (katMingguIni[tx.kategori]  || 0) + tx.nominal;
    if (d >= startMingguLalu && d < endMingguLalu)
                              katMingguLalu[tx.kategori] = (katMingguLalu[tx.kategori] || 0) + tx.nominal;
  });
  // Cari kategori dengan perubahan paling signifikan (>20% naik)
  const weeklyKatInsight = Object.entries(katMingguIni)
    .map(([id, val]) => {
      const prev = katMingguLalu[id] || 0;
      if (prev === 0) return null;
      const pct = Math.round(((val - prev) / prev) * 100);
      return { id, val, prev, pct };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0] || null;

  // Item 14: Spending by day-of-week
  const DAY_NAMES = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const spendByDay = Array(7).fill(0);
  const countByDay = Array(7).fill(0);
  txList.filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out').forEach(tx => {
    const dow = new Date(tx.tanggal + 'T00:00:00').getDay();
    spendByDay[dow] += tx.nominal;
    countByDay[dow]++;
  });
  // Hari paling boros (cukup data kalau ada transaksi)
  const maxDow   = spendByDay.indexOf(Math.max(...spendByDay));
  const borosDay = txList.filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out').length >= 7 ? DAY_NAMES[maxDow] : null;

  // Rolling 12 bulan (untuk charts)
  const rolling     = getRolling12Months();
  const chartLabels = rolling.map(({ year: y, month: m }) => `${BULAN_NAMES[m].substr(0, 3)} ${String(y).substr(2)}`);
  const chartMasuk  = rolling.map(({ year: y, month: m }) =>
    txList.filter(tx => tx.jenis === 'masuk'  && isSameMonth(tx.tanggal, y, m)).reduce((s, tx) => s + tx.nominal, 0));
  const chartKeluar = rolling.map(({ year: y, month: m }) =>
    txList.filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out' && isSameMonth(tx.tanggal, y, m)).reduce((s, tx) => s + tx.nominal, 0));
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
    .filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out')
    .sort((a, b) => b.nominal - a.nominal)
    .slice(0, 3);

  // ===== WEEKLY DATA (untuk toggle mingguan) =====
  const _8weeks = [];
  for (let i = 7; i >= 0; i--) {
    const endDate   = new Date(today);
    endDate.setDate(today.getDate() - i * 7);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
    _8weeks.push({ start: startDate, end: endDate });
  }
  const weeklyLabels   = _8weeks.map((_, i) => i === 7 ? 'W0' : `W-${7 - i}`);
  const weeklyCashflow = _8weeks.map(({ start, end }) => {
    const m = txList.filter(tx => { const d = new Date(tx.tanggal + 'T00:00:00'); return tx.jenis === 'masuk'  && d >= start && d <= end; }).reduce((s, tx) => s + tx.nominal, 0);
    const k = txList.filter(tx => { const d = new Date(tx.tanggal + 'T00:00:00'); return tx.jenis === 'keluar' && tx.type !== 'transfer_out' && d >= start && d <= end; }).reduce((s, tx) => s + tx.nominal, 0);
    return m - k;
  });

  // Pengeluaran per kategori — minggu ini (W0)
  const txMingguIniAll = txList.filter(tx => {
    const d = new Date(tx.tanggal + 'T00:00:00');
    return tx.jenis === 'keluar' && tx.type !== 'transfer_out' && d >= _8weeks[7].start && d <= _8weeks[7].end;
  });
  const katTotalWeekly = {};
  txMingguIniAll.filter(tx => tx.type !== 'transfer_out').forEach(tx => {
    katTotalWeekly[tx.kategori] = (katTotalWeekly[tx.kategori] || 0) + tx.nominal;
  });
  const katSortedWeekly = Object.entries(katTotalWeekly).sort((a, b) => b[1] - a[1]);

  // Boros per kategori — minggu ini (untuk card merge mode bulanan→weekly)
  const borosListWeekly = katSortedWeekly.slice(0, 3).map(([id, val]) => ({ id, val }));

  // Top spending per transaksi — minggu ini
  const bigSpendingWeekly = [...txMingguIniAll]
    .sort((a, b) => b.nominal - a.nominal)
    .slice(0, 3);

  return {
    year, month, txList, txBulanIni, txBulanLalu,
    totalMasuk, totalKeluar, totalNabung, cashflow,
    estimasiSaldo, totalNabungAllTime,
    prevKeluar, trendText, trendClass,
    hariIni, hariDalamBulan,
    tagihan, tagihanBulanIni, tagihanBelumBayar, tagihanSudahBayar,
    totalTagihanBelumBayar, uangBebas, bebasDipakai,
    borosList, katSorted, katTotal,
    rolling, chartLabels, chartMasuk, chartKeluar, chartCashflow,
    sudahCatatHariIni, recentTx, bigSpending,
    // Sprint B
    velocityAlert, weeklyKatInsight,
    spendByDay, countByDay, borosDay, DAY_NAMES,
    // Weekly toggle data
    weeklyLabels, weeklyCashflow, katSortedWeekly, borosListWeekly, bigSpendingWeekly,
  };
}

// ===== ASYNC WRAPPER dengan WorkerBridge =====
// renderDashboard() bisa pakai ini untuk offload ke worker kalau data besar.
// Saat ini sebagai bridge — kalau worker gagal, fallback ke calcDashboard() sync.

async function calcDashboardAsync() {
  const txList  = getTransaksi();
  const wallets = getWallets();
  const { year, month } = getCurrentMonthYear();

  // Hanya offload kalau data cukup besar (>200 transaksi)
  if (txList.length > 200) {
    try {
      const result = await WorkerBridge.run('calcDashboard', {
        transaksi: txList,
        wallets: wallets.map(w => ({ id: w.id, saldo_awal: w.saldo_awal || 0 })),
        year, month,
      });
      if (result) return { ...calcDashboard(), _workerData: result };
    } catch { /* fallback */ }
  }
  return calcDashboard();
}
