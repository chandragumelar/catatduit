// ===== DASHBOARD.CHART.JS — Chart rendering + Share summary =====

function initDashboardCharts(calc) {
  const { txList, rolling, chartLabels, chartMasuk, chartKeluar, chartCashflow, katSorted,
          spendByDay, borosDay, DAY_NAMES,
          weeklyLabels, weeklyCashflow, katSortedWeekly } = calc;

  destroyChart('combo');
  destroyChart('surplus');
  destroyChart('kategori');
  destroyChart('tren');
  destroyChart('dow');

  // Chart 1: Pemasukan vs Pengeluaran (combo bar+line) — default monthly
  _renderComboChart('monthly', calc);

  // Chart 2: Cashflow — default monthly
  _renderCashflowChart('monthly', calc);

  // Chart 3: Pengeluaran per Kategori — default monthly
  _renderKategoriChart('monthly', calc);

  // Chart 4: Tren kategori — default monthly
  const allKeluar = getKategori().keluar;
  const defaultKat = allKeluar[0]?.id || 'makan';
  renderTrenChart(defaultKat, 'monthly', calc);
  document.getElementById('tren-kategori-select')?.addEventListener('change', (e) => {
    const period = document.querySelector('.chart-period-btn.active')?.dataset.period || 'monthly';
    renderTrenChart(e.target.value, period, calc);
  });

  // Toggle bulanan/mingguan — sync semua grafik + spending card
  document.querySelectorAll('.chart-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const period    = btn.dataset.period;
      const isWeekly  = period === 'weekly';

      // Update semua labels
      const labels = {
        'chart-combo-label':     isWeekly ? 'Masuk & Keluar per Minggu'              : 'Masuk & Keluar per Bulan',
        'chart-cashflow-label':  isWeekly ? 'Cashflow per Minggu'                    : 'Cashflow per Bulan',
        'chart-kategori-label':  isWeekly ? 'Pengeluaran per Kategori · Minggu Ini'  : 'Pengeluaran per Kategori · Bulan Ini',
        'chart-tren-label':      isWeekly ? 'Tren per Kategori · 8 Minggu'           : 'Tren per Kategori · 12 Bulan',
      };
      Object.entries(labels).forEach(([id, text]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      });

      // Re-render semua charts
      _renderComboChart(period, calc);
      _renderCashflowChart(period, calc);
      _renderKategoriChart(period, calc);
      const selectedKat = document.getElementById('tren-kategori-select')?.value || defaultKat;
      renderTrenChart(selectedKat, period, calc);

      // Update spending card
      const spendingCard = document.querySelector(`[data-card-id="${DASHBOARD_CARDS.BOROS}"]`);
      if (spendingCard) spendingCard.innerHTML = _buildSpendingCardHTML(calc, period);
    });
  });

  // Chart 5: Pengeluaran per hari (Sprint B Item 14)
  if (borosDay && spendByDay) {
    const dowCtx = document.getElementById('chart-dow')?.getContext('2d');
    if (dowCtx) {
      const maxVal = Math.max(...spendByDay);
      state.chartInstances.dow = new Chart(dowCtx, {
        type: 'bar',
        data: {
          labels: DAY_NAMES,
          datasets: [{
            label: 'Pengeluaran',
            data: spendByDay,
            backgroundColor: spendByDay.map(v => v === maxVal ? 'rgba(220,38,38,0.75)' : 'rgba(13,148,136,0.55)'),
            borderRadius: 4,
          }],
        },
        options: {
          ...chartOptions({ plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${formatRupiah(ctx.raw)}` } } } }),
        },
      });
    }
  }
}

function _renderComboChart(period, calc) {
  destroyChart('combo');
  const comboCtx = document.getElementById('chart-combo')?.getContext('2d');
  if (!comboCtx) return;

  let labels, dataMasuk, dataKeluar;

  if (period === 'weekly') {
    // 8 minggu terakhir
    const today  = new Date();
    const weeks  = [];
    for (let i = 7; i >= 0; i--) {
      const endDate   = new Date(today);
      endDate.setDate(today.getDate() - i * 7);
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6);
      weeks.push({ start: startDate, end: endDate });
    }
    labels    = weeks.map((_, i) => i === 7 ? 'W0' : `W-${7 - i}`);
    dataMasuk  = weeks.map(({ start, end }) =>
      calc.txList.filter(tx => {
        const d = new Date(tx.tanggal + 'T00:00:00');
        return tx.jenis === 'masuk' && d >= start && d <= end;
      }).reduce((s, tx) => s + tx.nominal, 0));
    dataKeluar = weeks.map(({ start, end }) =>
      calc.txList.filter(tx => {
        const d = new Date(tx.tanggal + 'T00:00:00');
        return tx.jenis === 'keluar' && tx.type !== 'transfer_out' && d >= start && d <= end;
      }).reduce((s, tx) => s + tx.nominal, 0));
  } else {
    labels    = calc.chartLabels;
    dataMasuk  = calc.chartMasuk;
    dataKeluar = calc.chartKeluar;
  }

  state.chartInstances.combo = new Chart(comboCtx, {
    data: {
      labels,
      datasets: [
        { type: 'bar',  label: 'Keluar', data: dataKeluar, backgroundColor: 'rgba(220,38,38,0.7)', borderRadius: 4, order: 2 },
        { type: 'line', label: 'Masuk',  data: dataMasuk,  borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', borderWidth: 2, pointRadius: 3, tension: 0.3, fill: true, order: 1 },
      ],
    },
    options: chartOptions(),
  });
}

function _renderCashflowChart(period, calc) {
  destroyChart('surplus');
  const surplusCtx = document.getElementById('chart-surplus')?.getContext('2d');
  if (!surplusCtx) return;
  const labels = period === 'weekly' ? calc.weeklyLabels : calc.chartLabels;
  const data   = period === 'weekly' ? calc.weeklyCashflow : calc.chartCashflow;
  state.chartInstances.surplus = new Chart(surplusCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Cashflow', data, backgroundColor: data.map(v => v >= 0 ? 'rgba(5,150,105,0.7)' : 'rgba(220,38,38,0.7)'), borderRadius: 4 }],
    },
    options: chartOptions(),
  });
}

function _renderKategoriChart(period, calc) {
  destroyChart('kategori');
  const sorted = period === 'weekly' ? calc.katSortedWeekly : calc.katSorted;
  if (!sorted || sorted.length === 0) return;
  const katCtx = document.getElementById('chart-kategori')?.getContext('2d');
  if (!katCtx) return;
  state.chartInstances.kategori = new Chart(katCtx, {
    type: 'bar',
    data: {
      labels: sorted.map(([id]) => { const k = getKategoriById(id, 'keluar'); return `${k.icon} ${k.nama}`; }),
      datasets: [{ label: 'Pengeluaran', data: sorted.map(([, v]) => v), backgroundColor: CHART_COLORS.slice(0, sorted.length), borderRadius: 4 }],
    },
    options: { ...chartOptions(), indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${formatRupiah(ctx.raw)}` } } } },
  });
}

function renderTrenChart(katId, period, calc) {
  destroyChart('tren');
  const trenCtx = document.getElementById('chart-tren')?.getContext('2d');
  if (!trenCtx) return;

  let labels, trenData;
  if (period === 'weekly') {
    labels   = calc.weeklyLabels;
    const _8weeks = [];
    const today = new Date();
    for (let i = 7; i >= 0; i--) {
      const end   = new Date(today); end.setDate(today.getDate() - i * 7);
      const start = new Date(end);   start.setDate(end.getDate() - 6);
      _8weeks.push({ start, end });
    }
    trenData = _8weeks.map(({ start, end }) =>
      calc.txList.filter(tx => {
        const d = new Date(tx.tanggal + 'T00:00:00');
        return tx.jenis === 'keluar' && tx.type !== 'transfer_out' && tx.kategori === katId && d >= start && d <= end;
      }).reduce((s, tx) => s + tx.nominal, 0));
  } else {
    labels   = calc.chartLabels;
    trenData = calc.rolling.map(({ year: y, month: m }) =>
      calc.txList.filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out' && tx.kategori === katId && isSameMonth(tx.tanggal, y, m))
        .reduce((s, tx) => s + tx.nominal, 0));
  }

  state.chartInstances.tren = new Chart(trenCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Pengeluaran', data: trenData, backgroundColor: 'rgba(13,148,136,0.7)', borderRadius: 4 }],
    },
    options: chartOptions({ plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${formatRupiah(ctx.raw)}` } } } }),
  });
}

function showShareSummary(nama, year, month, totalMasuk, totalKeluar, cashflow, totalNabung, borosList) {
  const overlay  = document.getElementById('modal-overlay');
  const msgEl    = document.getElementById('modal-message');
  const btnC     = document.getElementById('modal-confirm');
  const btnCancel = document.getElementById('modal-cancel');
  const bulanNama = BULAN_NAMES[month];
  const topKat    = borosList.length > 0 ? getKategoriById(borosList[0].id, 'keluar').nama : '';

  msgEl.innerHTML = `
    <div class="share-preview">
      <div class="share-preview-title">CatatDuit — Ringkasan Keuangan</div>
      <div class="share-preview-month">${bulanNama} ${year}</div>
      <div class="share-preview-grid">
        <div><div class="share-preview-item-label">Uang Masuk</div><div class="share-preview-item-value">${formatRupiah(totalMasuk)}</div></div>
        <div><div class="share-preview-item-label">Uang Keluar</div><div class="share-preview-item-value">${formatRupiah(totalKeluar)}</div></div>
        <div><div class="share-preview-item-label">Sisa Bulan Ini</div><div class="share-preview-item-value">${formatRupiah(cashflow)}</div></div>
        ${totalNabung > 0 ? `<div><div class="share-preview-item-label">Nabung</div><div class="share-preview-item-value">${formatRupiah(totalNabung)}</div></div>` : ''}
      </div>
    </div>
    <p style="font-size:13px;color:var(--gray-500);text-align:center;">Screenshot layar ini untuk dibagikan 📸</p>`;

  const shareText = `💰 CatatDuit — ${bulanNama} ${year}\n\nUang Masuk: ${formatRupiah(totalMasuk)}\nUang Keluar: ${formatRupiah(totalKeluar)}\nSisa Bulan Ini: ${formatRupiah(cashflow)}\n${totalNabung > 0 ? `Nabung: ${formatRupiah(totalNabung)}\n` : ''}${topKat ? `Terboros: ${topKat}\n` : ''}\nCatat keuanganmu juga di CatatDuit!`;

  btnC.textContent = 'Salin Teks';
  btnC.style.background = 'var(--teal)';
  btnCancel.style.display = '';
  overlay.classList.add('show');

  const close = () => overlay.classList.remove('show');
  btnC.onclick = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => showToast('Teks berhasil disalin 📋')).catch(() => fallbackCopy(shareText));
    } else { fallbackCopy(shareText); }
    close();
  };
  btnCancel.onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}
