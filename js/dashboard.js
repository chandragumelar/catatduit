// ===== DASHBOARD.JS — Orchestrator (v3) =====
// Render logic saja. Kalkulasi → dashboard.calc.js, insight → dashboard.insight.js, chart → dashboard.chart.js

function buildTxItemHTML(tx) {
  const k      = getKategoriById(tx.kategori, tx.jenis);
  const prefix = tx.jenis === 'masuk' ? '+' : tx.jenis === 'nabung' ? '~' : '-';
  const cls    = tx.jenis === 'masuk' ? 'masuk' : tx.jenis === 'nabung' ? 'nabung' : 'keluar';
  const wallet = tx.wallet_id ? getWalletById(tx.wallet_id) : null;
  const walletTag = wallet && getWallets().length > 1
    ? `<span class="tx-wallet">${wallet.icon} ${escHtml(wallet.nama)}</span>`
    : '';
  return `<div class="tx-item" data-id="${tx.id}">
    <div class="tx-icon">${k.icon}</div>
    <div class="tx-info">
      <div class="tx-kategori">${escHtml(k.nama)}${walletTag}</div>
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

  // Hitung semua data
  const calc = calcDashboard();
  const {
    year, month, nama,
    totalMasuk, totalKeluar, totalNabung, cashflow,
    estimasiSaldo, totalNabungAllTime,
    trendText, trendClass,
    hariIni, hariDalamBulan, rataHarian, budgetHarian,
    tagihan, tagihanBulanIni, tagihanBelumBayar, tagihanSudahBayar,
    totalTagihanBelumBayar, uangBebas, bebasDipakai,
    borosList, katSorted, rolling, chartLabels,
    sudahCatatHariIni, recentTx, bigSpending,
  } = calc;

  // Insight (inject nama ke calcData untuk pipeline)
  const insightText = getInsightText({ ...calc, nama: getNama() });

  container.innerHTML = '';

  // 1. Greeting + insight
  _appendHTML(container, `
    <div class="greeting-section">
      <p class="greeting-text">Halo, ${escHtml(getNama())}! 👋</p>
      <p class="insight-text">${escHtml(insightText)}</p>
    </div>`);

  // 2. Wallet summary (v3: tampil kalau > 1 wallet)
  const wallets = getWallets();
  if (wallets.length > 1) {
    const walletCard = document.createElement('div');
    walletCard.className = 'card';
    walletCard.innerHTML = `
      <p class="summary-label">SALDO PER WALLET</p>
      <div class="wallet-summary-list">
        ${wallets.map(w => {
          const saldo = getSaldoWallet(w.id);
          return `<div class="wallet-summary-item">
            <span class="wallet-icon">${w.icon}</span>
            <span class="wallet-nama">${escHtml(w.nama)}</span>
            <span class="wallet-saldo ${saldo >= 0 ? 'income' : 'expense'}">${formatRupiah(saldo)}</span>
          </div>`;
        }).join('')}
      </div>
      <div class="wallet-summary-total">
        <span>Total</span>
        <span class="${estimasiSaldo >= 0 ? 'income' : 'expense'}">${formatRupiah(estimasiSaldo)}</span>
      </div>`;
    container.appendChild(walletCard);
  } else {
    // Single wallet: tampilkan seperti v2 estimasi saldo
    _appendHTML(container, `
      <div class="card summary-card--estimasi">
        <p class="summary-label">ESTIMASI SALDO</p>
        <p class="summary-value ${estimasiSaldo >= 0 ? 'income' : 'expense'} summary-value--large">${formatRupiah(estimasiSaldo)}</p>
        <p class="summary-sub-label">Saldo awal + semua pemasukan − semua pengeluaran</p>
      </div>`);
  }

  // 3. Health Score
  const hsContainer = document.createElement('div');
  container.appendChild(hsContainer);
  try { renderHealthScore(hsContainer); } catch(e) { /* jangan biarkan crash dashboard */ }

  // 4. Daily check-in
  const checkinEl = document.createElement('div');
  checkinEl.className = 'card checkin-card';
  checkinEl.innerHTML = sudahCatatHariIni
    ? `<div class="checkin-icon">✅</div>
       <div class="checkin-info">
         <div class="checkin-title">Sudah catat hari ini!</div>
         <div class="checkin-sub">Keep it up, terus pantau keuanganmu.</div>
       </div>`
    : `<div class="checkin-icon">📝</div>
       <div class="checkin-info">
         <div class="checkin-title">Belum catat hari ini</div>
         <div class="checkin-sub">Yuk catat sekarang biar akurat.</div>
       </div>
       <button class="checkin-btn" id="btn-checkin-catat">Catat</button>`;
  container.appendChild(checkinEl);
  document.getElementById('btn-checkin-catat')?.addEventListener('click', () => openInputPage('add'));

  // 4. Pace indicator
  if (totalMasuk > 0 || totalKeluar > 0) {
    _appendHTML(container, `
      <div class="card pace-card">
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
        </div>
      </div>`);
  }

  // 5. Summary cashflow
  _appendHTML(container, `
    <div class="summary-grid">
      <div class="summary-card summary-card--main">
        <p class="summary-label">Cashflow Bulan Ini</p>
        <p class="summary-value ${cashflow >= 0 ? 'income' : 'expense'} summary-value--large">${formatRupiah(cashflow)}</p>
        ${totalNabung > 0 ? `<p class="summary-sub-label">Sudah nabung ${formatRupiah(totalNabung)} bulan ini</p>` : ''}
      </div>
      <div class="summary-card">
        <p class="summary-label">Uang Masuk</p>
        <p class="summary-value income">${formatRupiah(totalMasuk)}</p>
      </div>
      <div class="summary-card">
        <p class="summary-label">Uang Keluar</p>
        <p class="summary-value expense">${formatRupiah(totalKeluar)}</p>
        ${trendText ? `<p class="summary-trend ${trendClass}">${escHtml(trendText)}</p>` : ''}
      </div>
    </div>`);

  // 6. Uang Bebas
  const uangBebasCard = document.createElement('div');
  uangBebasCard.className = 'card';
  if (tagihan.length === 0) {
    uangBebasCard.innerHTML = `
      <p class="summary-label">UANG BEBAS BULAN INI</p>
      <p class="uang-bebas-prompt">Tambah cicilan dan subscription rutinmu — biar kelihatan berapa uang yang bebas kamu pakai bulan ini.</p>
      <button class="btn-secondary" id="btn-goto-tagihan">Tambah Tagihan</button>`;
  } else {
    const namaBelumBayar = tagihanBelumBayar.map(t => `· ${escHtml(t.nama)}`).join('  ');
    const paidCount = tagihanSudahBayar.length;
    const totalCount = tagihanBulanIni.length;
    uangBebasCard.innerHTML = `
      <p class="summary-label">UANG BEBAS BULAN INI</p>
      <div class="uang-bebas-breakdown">
        <div class="uang-bebas-row">
          <span>Total uang kamu sekarang</span>
          <span>${formatRupiah(estimasiSaldo)}</span>
        </div>
        ${totalTagihanBelumBayar > 0 ? `
        <div class="uang-bebas-row uang-bebas-row--minus">
          <span>Tagihan belum dibayar${namaBelumBayar ? `<br><small class="tagihan-names">${namaBelumBayar}</small>` : ''}</span>
          <span class="minus">− ${formatRupiah(totalTagihanBelumBayar)}</span>
        </div>` : ''}
        <div class="uang-bebas-divider"></div>
        <div class="uang-bebas-row uang-bebas-row--result">
          <span>Setelah tagihan</span>
          <span class="${uangBebas >= 0 ? 'income' : 'expense'}">${formatRupiah(uangBebas)}</span>
        </div>
        ${totalNabung > 0 ? `
        <div class="uang-bebas-row uang-bebas-row--minus">
          <span>Nabung bulan ini</span>
          <span class="minus">− ${formatRupiah(totalNabung)}</span>
        </div>
        <div class="uang-bebas-divider"></div>
        <div class="uang-bebas-row uang-bebas-row--result uang-bebas-row--final">
          <span>Bebas dipakai</span>
          <span class="${bebasDipakai >= 0 ? 'income' : 'expense'}">${formatRupiah(bebasDipakai)}</span>
        </div>` : ''}
      </div>
      ${totalCount > 0 ? `<p class="tagihan-paid-status">${paidCount} dari ${totalCount} tagihan bulan ini sudah terbayar</p>` : ''}`;
  }
  container.appendChild(uangBebasCard);
  document.getElementById('btn-goto-tagihan')?.addEventListener('click', () => {
    state.tabunganTab = 'tagihan';
    navigateTo('tabungan');
  });

  // 7. Catatan terakhir
  const recentCard = document.createElement('div');
  recentCard.className = 'card';
  recentCard.innerHTML = `
    <div class="section-header"><h3 class="section-title">Catatan Terakhir</h3></div>
    ${recentTx.map(tx => buildTxItemHTML(tx)).join('')}
    <button class="section-link mt-8" id="btn-lihat-semua" style="display:block;padding:8px 0;">Lihat semua catatan →</button>`;
  container.appendChild(recentCard);
  recentCard.querySelectorAll('.tx-item').forEach(el => el.addEventListener('click', () => openInputPage('edit', el.dataset.id)));
  document.getElementById('btn-lihat-semua')?.addEventListener('click', () => navigateTo('riwayat'));

  // 8. Kategori terboros
  if (borosList.length > 0) {
    _appendHTML(container, `
      <div class="card">
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
        }).join('')}
      </div>`);
  }

  // 9. Budget
  const budgetContainer = document.createElement('div');
  container.appendChild(budgetContainer);
  try { renderBudgetSection(budgetContainer); } catch(e) {}

  // 10. Charts
  const allKeluar = getKategori().keluar;
  const defaultKat = allKeluar[0]?.id || 'makan';

  _appendHTML(container, `
    <div class="card">
      <div class="section-header"><h3 class="section-title">Pemasukan vs Pengeluaran</h3></div>
      <div class="chart-container"><canvas id="chart-combo"></canvas></div>
    </div>
    <div class="card">
      <div class="section-header"><h3 class="section-title">Cashflow per Bulan</h3></div>
      <div class="chart-container"><canvas id="chart-surplus"></canvas></div>
    </div>
    ${katSorted.length > 0 ? `
    <div class="card">
      <div class="section-header"><h3 class="section-title">Pengeluaran per Kategori</h3></div>
      <div class="chart-container" style="height:${Math.max(160, katSorted.length * 36)}px"><canvas id="chart-kategori"></canvas></div>
      <table class="category-table" style="margin-top:12px;">
        <thead><tr><th>Kategori</th><th>Total</th><th>%</th></tr></thead>
        <tbody>
          ${katSorted.map(([id, val], i) => {
            const k = getKategoriById(id, 'keluar');
            const pct = totalKeluar > 0 ? Math.round((val / totalKeluar) * 100) : 0;
            return `<tr>
              <td><span class="category-dot" style="background:${CHART_COLORS[i]}"></span>${escHtml(k.icon)} ${escHtml(k.nama)}</td>
              <td>${formatRupiah(val)}</td><td>${pct}%</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>` : ''}
    <div class="card">
      <div class="section-header">
        <h3 class="section-title">Tren Kategori</h3>
        <select class="tren-select" id="tren-kategori-select">
          ${allKeluar.map(k => `<option value="${k.id}" ${k.id === defaultKat ? 'selected' : ''}>${k.icon} ${escHtml(k.nama)}</option>`).join('')}
        </select>
      </div>
      <div class="chart-container"><canvas id="chart-tren"></canvas></div>
    </div>`);

  // 10. Pengeluaran terbesar
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

  // 11. Share
  _appendHTML(container, `
    <div class="card">
      <button class="btn-share" id="btn-share-summary">
        <i data-lucide="share-2"></i>
        Bagikan Ringkasan Bulan Ini
      </button>
    </div>`);
  document.getElementById('btn-share-summary')?.addEventListener('click', () =>
    showShareSummary(getNama(), year, month, totalMasuk, totalKeluar, cashflow, totalNabung, borosList));

  // Init semua chart setelah DOM settled
  setTimeout(() => {
    initDashboardCharts(calc);
    if (window.lucide) lucide.createIcons();
  }, 0);
}

// Helper: append HTML string ke container
function _appendHTML(container, html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  while (tmp.firstChild) container.appendChild(tmp.firstChild);
}
