// ===== DASHBOARD.CHART.JS — Chart rendering + Share summary =====

function initDashboardCharts(calc) {
  const { txList, rolling, chartLabels, chartMasuk, chartKeluar, chartCashflow, katSorted,
          spendByDay, borosDay, DAY_NAMES } = calc;

  destroyChart('combo');
  destroyChart('surplus');
  destroyChart('kategori');
  destroyChart('tren');
  destroyChart('dow');

  // Chart 1: Pemasukan vs Pengeluaran (combo bar+line) — default monthly
  _renderComboChart('monthly', calc);

  // Toggle bulanan/mingguan
  document.querySelectorAll('.chart-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _renderComboChart(btn.dataset.period, calc);
      const note = document.getElementById('chart-week-note');
      if (note) {
        if (btn.dataset.period === 'weekly') {
          note.style.display = 'block';
          note.style.fontSize = '10px';
          note.style.textTransform = 'uppercase';
          note.style.letterSpacing = '0.04em';
          note.style.color = 'var(--gray-400)';
        } else {
          note.style.display = 'none';
        }
      }
    });
  });

  // Chart 2: Cashflow per bulan
  const surplusCtx = document.getElementById('chart-surplus')?.getContext('2d');
  if (surplusCtx) {
    state.chartInstances.surplus = new Chart(surplusCtx, {
      type: 'bar',
      data: {
        labels: chartLabels,
        datasets: [{ label: 'Cashflow', data: chartCashflow, backgroundColor: chartCashflow.map(v => v >= 0 ? 'rgba(5,150,105,0.7)' : 'rgba(220,38,38,0.7)'), borderRadius: 4 }],
      },
      options: chartOptions(),
    });
  }

  // Chart 3: Pengeluaran per kategori (horizontal bar)
  if (katSorted.length > 0) {
    const katCtx = document.getElementById('chart-kategori')?.getContext('2d');
    if (katCtx) {
      state.chartInstances.kategori = new Chart(katCtx, {
        type: 'bar',
        data: {
          labels: katSorted.map(([id]) => { const k = getKategoriById(id, 'keluar'); return `${k.icon} ${k.nama}`; }),
          datasets: [{ label: 'Pengeluaran', data: katSorted.map(([, v]) => v), backgroundColor: CHART_COLORS.slice(0, katSorted.length), borderRadius: 4 }],
        },
        options: { ...chartOptions(), indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${formatRupiah(ctx.raw)}` } } } },
      });
    }
  }

  // Chart 4: Tren kategori (default kategori pertama)
  const allKeluar = getKategori().keluar;
  const defaultKat = allKeluar[0]?.id || 'makan';
  renderTrenChart(defaultKat, txList, rolling, chartLabels);
  document.getElementById('tren-kategori-select')?.addEventListener('change', (e) => {
    renderTrenChart(e.target.value, txList, rolling, chartLabels);
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
        return tx.jenis === 'keluar' && d >= start && d <= end;
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

function renderTrenChart(katId, txList, rolling, chartLabels) {
  destroyChart('tren');
  const trenData = rolling.map(({ year: y, month: m }) =>
    txList.filter(tx => tx.jenis === 'keluar' && tx.kategori === katId && isSameMonth(tx.tanggal, y, m))
      .reduce((s, tx) => s + tx.nominal, 0));
  const trenCtx = document.getElementById('chart-tren')?.getContext('2d');
  if (!trenCtx) return;
  state.chartInstances.tren = new Chart(trenCtx, {
    type: 'bar',
    data: {
      labels: chartLabels,
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
