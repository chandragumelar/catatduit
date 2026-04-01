// ===== DASHBOARD.JS — Dashboard rendering =====

function buildTxItemHTML(tx) {
  const k = getKategoriById(tx.kategori, tx.jenis);
  const prefix = tx.jenis === 'masuk' ? '+' : tx.jenis === 'nabung' ? '~' : '-';
  const cls = tx.jenis === 'masuk' ? 'masuk' : tx.jenis === 'nabung' ? 'nabung' : 'keluar';
  return `<div class="tx-item" data-id="${tx.id}">
    <div class="tx-icon">${k.icon}</div>
    <div class="tx-info">
      <div class="tx-kategori">${escHtml(k.nama)}</div>
      ${tx.catatan ? `<div class="tx-catatan">${escHtml(tx.catatan)}</div>` : ''}
    </div>
    <div class="tx-right">
      <div class="tx-nominal ${cls}">${prefix}${formatRupiah(tx.nominal)}</div>
      <div class="tx-tanggal">${formatDate(tx.tanggal)}</div>
    </div>
  </div>`;
}

function renderDashboard() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;
  const txList = getTransaksi();

  if (txList.length === 0) {
    Object.keys(state.chartInstances).forEach(k => destroyChart(k));
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💸</div>
        <h3 class="empty-title">Belum ada catatan</h3>
        <p class="empty-desc">Yuk mulai catat keuanganmu!</p>
        <button class="btn-primary" id="btn-cta-empty" style="max-width:240px;">Catat Pertamamu</button>
      </div>`;
    document.getElementById('btn-cta-empty')?.addEventListener('click', () => openInputPage('add'));
    return;
  }

  const { year, month } = getCurrentMonthYear();
  const txBulanIni = txList.filter(tx => isSameMonth(tx.tanggal, year, month));
  const totalMasuk = txBulanIni.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0);
  const totalKeluar = txBulanIni.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0);
  const totalNabung = txBulanIni.filter(tx => tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0);
  const cashflow = totalMasuk - totalKeluar;

  // Estimasi Saldo = saldo awal + semua masuk all time - semua keluar all time
  const saldoAwal = getSaldoAwal();
  const totalMasukAllTime = txList.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0);
  const totalKeluarAllTime = txList.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0);
  const estimasiSaldo = saldoAwal + totalMasukAllTime - totalKeluarAllTime;

  const prevDate = new Date(year, month - 1, 1);
  const prevYear = prevDate.getFullYear(), prevMonth = prevDate.getMonth();
  const txBulanLalu = txList.filter(tx => isSameMonth(tx.tanggal, prevYear, prevMonth));
  const prevKeluar = txBulanLalu.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0);

  let trendText = '', trendClass = 'neutral';
  if (prevKeluar > 0) {
    const diff = ((totalKeluar - prevKeluar) / prevKeluar) * 100;
    if (diff > 0) { trendText = `↑ Naik ${Math.round(diff)}% dari bulan lalu`; trendClass = 'up'; }
    else if (diff < 0) { trendText = `↓ Turun ${Math.round(Math.abs(diff))}% dari bulan lalu`; trendClass = 'down'; }
    else { trendText = 'Stabil dari bulan lalu'; }
  }

  const hariIni = new Date().getDate();
  const hariDalamBulan = new Date(year, month + 1, 0).getDate();
  const rataHarian = hariIni > 0 ? Math.round(totalKeluar / hariIni) : 0;
  const budgetHarian = totalMasuk > 0 ? Math.round(totalMasuk / hariDalamBulan) : 0;

  const nama = getNama();
  let insightText = '';
  if (txBulanLalu.length === 0) {
    insightText = `Selamat datang, ${nama}! Pantau keuanganmu di sini setiap hari ya.`;
  } else if (totalKeluar > totalMasuk && totalMasuk > 0) {
    insightText = 'Pengeluaran sudah melewati pemasukan bulan ini. Yuk mulai pantau lebih ketat.';
  } else if (prevKeluar > 0) {
    const diff = ((totalKeluar - prevKeluar) / prevKeluar) * 100;
    if (diff <= -10) insightText = 'Lebih hemat dari bulan lalu. Mantap! 🎉';
    else if (diff >= 10 && cashflow < 0) insightText = 'Pengeluaran naik dan sudah melebihi pemasukan. Tetap pantau ya.';
    else if (diff >= 10 && cashflow >= 0) insightText = 'Pengeluaran naik sedikit, tapi masih aman. Tetap pantau ya.';
    else insightText = 'Pengeluaran stabil bulan ini. 👍';
  } else {
    insightText = `Hai ${nama}! Catat terus biar kelihatan polanya ya.`;
  }

  const todayStr = getTodayStr();
  const sudahCatatHariIni = txList.some(tx => tx.tanggal === todayStr);

  // Kategori terboros
  const katTotalBulanIni = {};
  txBulanIni.filter(tx => tx.jenis === 'keluar').forEach(tx => {
    katTotalBulanIni[tx.kategori] = (katTotalBulanIni[tx.kategori] || 0) + tx.nominal;
  });
  const katTotalBulanLalu = {};
  txBulanLalu.filter(tx => tx.jenis === 'keluar').forEach(tx => {
    katTotalBulanLalu[tx.kategori] = (katTotalBulanLalu[tx.kategori] || 0) + tx.nominal;
  });
  const borosList = Object.entries(katTotalBulanIni)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, val]) => {
      const prevVal = katTotalBulanLalu[id] || 0;
      let badge = 'same', badgeText = 'stabil';
      if (prevVal > 0) {
        const pct = Math.round(((val - prevVal) / prevVal) * 100);
        if (pct > 5) { badge = 'naik'; badgeText = `↑ ${pct}%`; }
        else if (pct < -5) { badge = 'turun'; badgeText = `↓ ${Math.abs(pct)}%`; }
      }
      return { id, val, badge, badgeText };
    });

  container.innerHTML = '';

  // 1. Greeting & insight
  const greetEl = document.createElement('div');
  greetEl.innerHTML = `
    <div class="greeting-section">
      <p class="greeting-text">Halo, ${escHtml(nama)}! 👋</p>
      <p class="insight-text">${escHtml(insightText)}</p>
    </div>`;
  container.appendChild(greetEl);

  // 2. Estimasi Saldo — card utama paling atas
  const estimasiCard = document.createElement('div');
  estimasiCard.className = 'card summary-card--estimasi';
  estimasiCard.innerHTML = `
    <p class="summary-label">ESTIMASI SALDO</p>
    <p class="summary-value ${estimasiSaldo >= 0 ? 'income' : 'expense'} summary-value--large">${formatRupiah(estimasiSaldo)}</p>
    <p class="summary-sub-label">Saldo awal + semua pemasukan − semua pengeluaran</p>`;
  container.appendChild(estimasiCard);

  // 3. Daily check-in
  const checkinEl = document.createElement('div');
  checkinEl.className = 'card checkin-card';
  if (sudahCatatHariIni) {
    checkinEl.innerHTML = `
      <div class="checkin-icon">✅</div>
      <div class="checkin-info">
        <div class="checkin-title">Sudah catat hari ini!</div>
        <div class="checkin-sub">Keep it up, terus pantau keuanganmu.</div>
      </div>`;
  } else {
    checkinEl.innerHTML = `
      <div class="checkin-icon">📝</div>
      <div class="checkin-info">
        <div class="checkin-title">Belum catat hari ini</div>
        <div class="checkin-sub">Yuk catat sekarang biar akurat.</div>
      </div>
      <button class="checkin-btn" id="btn-checkin-catat">Catat</button>`;
  }
  container.appendChild(checkinEl);
  document.getElementById('btn-checkin-catat')?.addEventListener('click', () => openInputPage('add'));

  // 4. Pace indicator
  if (totalMasuk > 0 || totalKeluar > 0) {
    const paceEl = document.createElement('div');
    paceEl.className = 'card pace-card';
    paceEl.innerHTML = `
      <div class="pace-content">
        <div class="pace-left">
          <p class="pace-label">Hari ke-${hariIni} dari ${hariDalamBulan}</p>
          <p class="pace-value">Rata-rata pengeluaran <strong>${formatRupiah(rataHarian)}</strong><span class="pace-unit">/hari</span></p>
        </div>
        ${budgetHarian > 0 ? `
        <div class="pace-right">
          <p class="pace-label">Budget harian</p>
          <p class="pace-value ${rataHarian > budgetHarian ? 'expense' : 'income'}">${formatRupiah(budgetHarian)}</p>
        </div>` : ''}
      </div>`;
    container.appendChild(paceEl);
  }

  // 5. Summary cards — Cashflow Bulan Ini
  const summaryEl = document.createElement('div');
  summaryEl.className = 'summary-grid';
  summaryEl.innerHTML = `
    <div class="summary-card summary-card--main">
      <div>
        <p class="summary-label">Cashflow Bulan Ini</p>
        <p class="summary-value ${cashflow >= 0 ? 'income' : 'expense'} summary-value--large">${formatRupiah(cashflow)}</p>
        ${totalNabung > 0 ? `<p class="summary-sub-label">Sudah nabung ${formatRupiah(totalNabung)} bulan ini</p>` : ''}
      </div>
    </div>
    <div class="summary-card">
      <p class="summary-label">Uang Masuk</p>
      <p class="summary-value income">${formatRupiah(totalMasuk)}</p>
    </div>
    <div class="summary-card">
      <p class="summary-label">Uang Keluar</p>
      <p class="summary-value expense">${formatRupiah(totalKeluar)}</p>
      ${trendText ? `<p class="summary-trend ${trendClass}">${escHtml(trendText)}</p>` : ''}
    </div>`;
  container.appendChild(summaryEl);

  // 6. Uang Bebas Bulan Ini
  const tagihan = getTagihan();
  const tagihanBulanIni = tagihan.filter(t => {
    if (!t.jatuhTempo) return false;
    const d = new Date(t.jatuhTempo + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const totalTagihanBulanIni = tagihanBulanIni.reduce((s, t) => s + (t.nominal || 0), 0);
  const uangBebas = estimasiSaldo - totalTagihanBulanIni;

  const uangBebasCard = document.createElement('div');
  uangBebasCard.className = 'card';
  if (tagihan.length === 0) {
    uangBebasCard.innerHTML = `
      <p class="summary-label">UANG BEBAS BULAN INI</p>
      <p class="uang-bebas-prompt">Tambah cicilan dan subscription rutinmu — biar kelihatan berapa uang yang bebas kamu pakai bulan ini.</p>
      <button class="btn-secondary" id="btn-goto-tagihan">Tambah Tagihan</button>`;
  } else {
    const namaTagihan = tagihanBulanIni.map(t => `<span class="tagihan-nama-chip">· ${escHtml(t.nama)}</span>`).join('');
    uangBebasCard.innerHTML = `
      <p class="summary-label">UANG BEBAS BULAN INI</p>
      <p class="summary-value ${uangBebas >= 0 ? 'income' : 'expense'} summary-value--large">${formatRupiah(uangBebas)}</p>
      <p class="summary-sub-label">Tagihan bulan ini: ${formatRupiah(totalTagihanBulanIni)}</p>
      <div class="tagihan-nama-list">${namaTagihan}</div>`;
  }
  container.appendChild(uangBebasCard);
  document.getElementById('btn-goto-tagihan')?.addEventListener('click', () => {
    state.tabunganTab = 'tagihan';
    navigateTo('tabungan');
  });

  // 7. Recent transactions
  const recent = [...txList].sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id.localeCompare(a.id)).slice(0, 5);
  const recentCard = document.createElement('div');
  recentCard.className = 'card';
  recentCard.innerHTML = `
    <div class="section-header"><h3 class="section-title">Catatan Terakhir</h3></div>
    ${recent.map(tx => buildTxItemHTML(tx)).join('')}
    <button class="section-link mt-8" id="btn-lihat-semua" style="display:block;padding:8px 0;">Lihat semua catatan →</button>`;
  container.appendChild(recentCard);
  recentCard.querySelectorAll('.tx-item').forEach(el => el.addEventListener('click', () => openInputPage('edit', el.dataset.id)));
  document.getElementById('btn-lihat-semua')?.addEventListener('click', () => navigateTo('riwayat'));

  // 8. Kategori terboros
  if (borosList.length > 0) {
    const borosCard = document.createElement('div');
    borosCard.className = 'card';
    borosCard.innerHTML = `
      <div class="section-header"><h3 class="section-title">Kategori Terboros Bulan Ini</h3></div>
      ${borosList.map(({ id, val, badge, badgeText }) => {
        const k = getKategoriById(id, 'keluar');
        return `<div class="boros-item">
          <div class="boros-icon">${k.icon}</div>
          <div class="boros-info">
            <div class="boros-nama">${escHtml(k.nama)}</div>
            <div class="boros-sub">${formatRupiah(val)}</div>
          </div>
          <span class="boros-badge ${badge}">${badgeText}</span>
        </div>`;
      }).join('')}`;
    container.appendChild(borosCard);
  }

  // 9. Charts
  const rolling = getRolling12Months();
  const chartLabels = rolling.map(({ year: y, month: m }) => `${BULAN_NAMES[m].substr(0, 3)} ${String(y).substr(2)}`);
  const chartMasuk = rolling.map(({ year: y, month: m }) =>
    txList.filter(tx => tx.jenis === 'masuk' && isSameMonth(tx.tanggal, y, m)).reduce((s, tx) => s + tx.nominal, 0));
  const chartKeluar = rolling.map(({ year: y, month: m }) =>
    txList.filter(tx => tx.jenis === 'keluar' && isSameMonth(tx.tanggal, y, m)).reduce((s, tx) => s + tx.nominal, 0));
  const chartCashflow = chartMasuk.map((m, i) => m - chartKeluar[i]);

  const comboCard = document.createElement('div');
  comboCard.className = 'card';
  comboCard.innerHTML = `
    <div class="section-header"><h3 class="section-title">Pemasukan vs Pengeluaran</h3></div>
    <div class="chart-container"><canvas id="chart-combo"></canvas></div>`;
  container.appendChild(comboCard);

  const cashflowChartCard = document.createElement('div');
  cashflowChartCard.className = 'card';
  cashflowChartCard.innerHTML = `
    <div class="section-header"><h3 class="section-title">Cashflow per Bulan</h3></div>
    <div class="chart-container"><canvas id="chart-surplus"></canvas></div>`;
  container.appendChild(cashflowChartCard);

  // 10. Pengeluaran per kategori
  const katTotal = {};
  txBulanIni.filter(tx => tx.jenis === 'keluar').forEach(tx => {
    katTotal[tx.kategori] = (katTotal[tx.kategori] || 0) + tx.nominal;
  });
  const katSorted = Object.entries(katTotal).sort((a, b) => b[1] - a[1]);

  // 11. Tren Kategori
  const allKeluar = [...getKategori().keluar];
  const trenCard = document.createElement('div');
  trenCard.className = 'card';
  const defaultKatTren = allKeluar[0]?.id || 'makan';
  trenCard.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">Tren Kategori</h3>
      <select class="tren-select" id="tren-kategori-select">
        ${allKeluar.map(k => `<option value="${k.id}" ${k.id === defaultKatTren ? 'selected' : ''}>${k.icon} ${escHtml(k.nama)}</option>`).join('')}
      </select>
    </div>
    <div class="chart-container"><canvas id="chart-tren"></canvas></div>`;
  container.appendChild(trenCard);

  if (katSorted.length > 0) {
    const katColors = CHART_COLORS.slice(0, katSorted.length);
    const tableRows = katSorted.map(([id, val], i) => {
      const k = getKategoriById(id, 'keluar');
      const pct = totalKeluar > 0 ? Math.round((val / totalKeluar) * 100) : 0;
      return `<tr>
        <td><span class="category-dot" style="background:${katColors[i]}"></span>${escHtml(k.icon)} ${escHtml(k.nama)}</td>
        <td>${formatRupiah(val)}</td><td>${pct}%</td></tr>`;
    }).join('');
    const wmwCard = document.createElement('div');
    wmwCard.className = 'card';
    wmwCard.innerHTML = `
      <div class="section-header"><h3 class="section-title">Pengeluaran per Kategori</h3></div>
      <div class="chart-container" style="height:${Math.max(160, katSorted.length * 36)}px"><canvas id="chart-kategori"></canvas></div>
      <table class="category-table" style="margin-top:12px;">
        <thead><tr><th>Kategori</th><th>Total</th><th>%</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>`;
    container.appendChild(wmwCard);
  }

  // 12. Biggest spending
  const bigSpending = [...txBulanIni].filter(tx => tx.jenis === 'keluar').sort((a, b) => b.nominal - a.nominal).slice(0, 3);
  if (bigSpending.length > 0) {
    const bigCard = document.createElement('div');
    bigCard.className = 'card';
    bigCard.innerHTML = `
      <div class="section-header"><h3 class="section-title">Pengeluaran Terbesar Bulan Ini</h3></div>
      ${bigSpending.map((tx, i) => {
        const k = getKategoriById(tx.kategori, 'keluar');
        return `<div class="big-tx-item" data-id="${tx.id}" style="cursor:pointer">
          <div class="big-tx-rank">${i + 1}</div>
          <div class="tx-icon">${k.icon}</div>
          <div class="tx-info">
            <div class="tx-kategori">${escHtml(k.nama)}</div>
            ${tx.catatan ? `<div class="tx-catatan">${escHtml(tx.catatan)}</div>` : ''}
          </div>
          <div class="tx-right">
            <div class="tx-nominal keluar">${formatRupiah(tx.nominal)}</div>
            <div class="tx-tanggal">${formatDate(tx.tanggal)}</div>
          </div>
        </div>`;
      }).join('')}`;
    container.appendChild(bigCard);
    bigCard.querySelectorAll('.big-tx-item').forEach(el => el.addEventListener('click', () => openInputPage('edit', el.dataset.id)));
  }

  // 13. Share summary
  const shareCard = document.createElement('div');
  shareCard.className = 'card';
  shareCard.innerHTML = `
    <button class="btn-share" id="btn-share-summary">
      <i data-lucide="share-2"></i>
      Bagikan Ringkasan Bulan Ini
    </button>`;
  container.appendChild(shareCard);
  document.getElementById('btn-share-summary')?.addEventListener('click', () =>
    showShareSummary(nama, year, month, totalMasuk, totalKeluar, cashflow, totalNabung, borosList));

  // Init charts
  setTimeout(() => {
    destroyChart('combo'); destroyChart('surplus'); destroyChart('kategori'); destroyChart('tren');

    const comboCtx = document.getElementById('chart-combo')?.getContext('2d');
    if (comboCtx) {
      state.chartInstances.combo = new Chart(comboCtx, {
        data: {
          labels: chartLabels,
          datasets: [
            { type: 'bar', label: 'Keluar', data: chartKeluar, backgroundColor: 'rgba(220,38,38,0.7)', borderRadius: 4, order: 2 },
            { type: 'line', label: 'Masuk', data: chartMasuk, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', borderWidth: 2, pointRadius: 3, tension: 0.3, fill: true, order: 1 },
          ],
        },
        options: chartOptions(),
      });
    }

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

    renderTrenChart(defaultKatTren, txList, rolling, chartLabels);
    document.getElementById('tren-kategori-select')?.addEventListener('change', (e) => {
      renderTrenChart(e.target.value, txList, rolling, chartLabels);
    });

    if (window.lucide) lucide.createIcons();
  }, 0);
}

function renderTrenChart(katId, txList, rolling, chartLabels) {
  destroyChart('tren');
  const trenData = rolling.map(({ year: y, month: m }) =>
    txList.filter(tx => tx.jenis === 'keluar' && tx.kategori === katId && isSameMonth(tx.tanggal, y, m))
      .reduce((s, tx) => s + tx.nominal, 0));
  const trenCtx = document.getElementById('chart-tren')?.getContext('2d');
  if (trenCtx) {
    state.chartInstances.tren = new Chart(trenCtx, {
      type: 'bar',
      data: {
        labels: chartLabels,
        datasets: [{ label: 'Pengeluaran', data: trenData, backgroundColor: 'rgba(13,148,136,0.7)', borderRadius: 4 }],
      },
      options: chartOptions({ plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${formatRupiah(ctx.raw)}` } } } }),
    });
  }
}

function showShareSummary(nama, year, month, totalMasuk, totalKeluar, cashflow, totalNabung, borosList) {
  const overlay = document.getElementById('modal-overlay');
  const msgEl = document.getElementById('modal-message');
  const btnC = document.getElementById('modal-confirm');
  const btnCancel = document.getElementById('modal-cancel');
  const bulanNama = BULAN_NAMES[month];
  const topKat = borosList.length > 0 ? getKategoriById(borosList[0].id, 'keluar').nama : '';

  msgEl.innerHTML = `
    <div class="share-preview">
      <div class="share-preview-title">CatatDuit — Ringkasan Keuangan</div>
      <div class="share-preview-month">${bulanNama} ${year}</div>
      <div class="share-preview-grid">
        <div><div class="share-preview-item-label">Uang Masuk</div><div class="share-preview-item-value">${formatRupiah(totalMasuk)}</div></div>
        <div><div class="share-preview-item-label">Uang Keluar</div><div class="share-preview-item-value">${formatRupiah(totalKeluar)}</div></div>
        <div><div class="share-preview-item-label">Cashflow</div><div class="share-preview-item-value">${formatRupiah(cashflow)}</div></div>
        <div><div class="share-preview-item-label">Nabung</div><div class="share-preview-item-value">${formatRupiah(totalNabung)}</div></div>
      </div>
    </div>
    <p style="font-size:13px;color:var(--gray-500);text-align:center;">Screenshot layar ini untuk dibagikan 📸</p>`;

  btnC.textContent = 'Salin Teks';
  btnC.style.background = 'var(--teal)';
  btnCancel.style.display = '';
  overlay.classList.add('show');

  const shareText = `💰 CatatDuit — ${bulanNama} ${year}\n\nUang Masuk: ${formatRupiah(totalMasuk)}\nUang Keluar: ${formatRupiah(totalKeluar)}\nCashflow: ${formatRupiah(cashflow)}\nNabung: ${formatRupiah(totalNabung)}\n${topKat ? `Terboros: ${topKat}\n` : ''}\nCatat keuanganmu juga di CatatDuit!`;
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
