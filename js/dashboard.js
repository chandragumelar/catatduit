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
    year, month,
    totalMasuk, totalKeluar, totalNabung, cashflow,
    estimasiSaldo,
    trendText, trendClass,
    hariIni, hariDalamBulan, rataHarian, budgetHarian,
    tagihan, tagihanBulanIni, tagihanSudahBayar,
    totalTagihanBelumBayar, uangBebas, bebasDipakai,
    borosList, katSorted,
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

  // 2. Keuangan Bulan Ini — card collapsible (gabungan wallet summary + uang bebas)
  const wallets = getWallets();
  _renderKeuanganBulanIni(container, {
    wallets, estimasiSaldo, totalNabung, totalTagihanBelumBayar,
    tagihanSudahBayar, tagihanBulanIni,
    uangBebas, bebasDipakai, tagihan,
  });

  // 3. Health Score
  const hsContainer = document.createElement('div');
  container.appendChild(hsContainer);
  try { renderHealthScore(hsContainer); } catch(e) { /* jangan biarkan crash dashboard */ }

  // 4. Cerita card (entry point)
  const ceritaContainer = document.createElement('div');
  container.appendChild(ceritaContainer);
  try { renderCeritaCard(ceritaContainer); } catch(e) {}

  // 5. Daily check-in
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

  // 6. (merged ke section 2 — _renderKeuanganBulanIni)

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

// ===== KEUANGAN BULAN INI — collapsible card =====
// Gabungan: wallet summary + uang bebas. Collapsed by default, expand on tap.

let _keuanganExpanded = false; // state per session

function _renderKeuanganBulanIni(container, {
  wallets, estimasiSaldo, totalNabung, totalTagihanBelumBayar,
  tagihanSudahBayar, tagihanBulanIni,
  uangBebas, bebasDipakai, tagihan,
}) {
  // Tentukan angka hero — bebas dipakai kalau ada tagihan/nabung, else estimasi saldo
  const hasRincian = totalTagihanBelumBayar > 0 || totalNabung > 0;
  const heroAngka  = hasRincian ? bebasDipakai : estimasiSaldo;
  const heroClass  = heroAngka >= 0 ? 'income' : 'expense';

  const card = document.createElement('div');
  card.className = 'card keuangan-card';
  card.id = 'keuangan-bulan-ini-card';

  function render() {
    card.innerHTML = `
      <div class="keuangan-collapsed" id="keuangan-toggle">
        <div class="keuangan-collapsed-left">
          <p class="summary-label">KEUANGAN BULAN INI</p>
          <p class="keuangan-hero ${heroClass}">${formatRupiah(heroAngka)}</p>
          <p class="keuangan-hint">${_keuanganExpanded ? 'Sembunyikan ▴' : 'Lihat rincian ▾'}</p>
        </div>
      </div>

      ${_keuanganExpanded ? `
      <div class="keuangan-detail" id="keuangan-detail">

        ${wallets.length > 1 ? `
        <div class="keuangan-section">
          ${wallets.map(w => {
            const saldo = getSaldoWallet(w.id);
            return `<div class="keuangan-row">
              <span class="keuangan-row-label">${w.icon} ${escHtml(w.nama)}</span>
              <span class="keuangan-row-val ${saldo >= 0 ? '' : 'expense'}">${formatRupiah(saldo)}</span>
            </div>`;
          }).join('')}
        </div>` : ''}

        <div class="keuangan-divider"></div>
        <div class="keuangan-row keuangan-row--sub">
          <span>Total saldo</span>
          <span>${formatRupiah(estimasiSaldo)}</span>
        </div>

        ${totalTagihanBelumBayar > 0 ? `
        <div class="keuangan-row keuangan-row--minus">
          <span>Tagihan belum dibayar</span>
          <span>− ${formatRupiah(totalTagihanBelumBayar)}</span>
        </div>
        <div class="keuangan-divider"></div>
        <div class="keuangan-row keuangan-row--result">
          <span>Setelah tagihan</span>
          <span class="${uangBebas >= 0 ? 'income' : 'expense'}">${formatRupiah(uangBebas)}</span>
        </div>` : ''}

        ${totalNabung > 0 ? `
        <div class="keuangan-row keuangan-row--minus">
          <span>Nabung bulan ini</span>
          <span>− ${formatRupiah(totalNabung)}</span>
        </div>
        <div class="keuangan-divider"></div>
        <div class="keuangan-row keuangan-row--result keuangan-row--final">
          <span>Bebas dipakai</span>
          <span class="${bebasDipakai >= 0 ? 'income' : 'expense'}">${formatRupiah(bebasDipakai)}</span>
        </div>` : ''}

        ${tagihanBulanIni.length > 0 ? `
        <p class="tagihan-paid-status">
          ${tagihanSudahBayar.length} dari ${tagihanBulanIni.length} tagihan bulan ini sudah terbayar
        </p>` : tagihan.length === 0 ? `
        <button class="btn-text-small" id="btn-goto-tagihan-card" style="margin-top:8px;">
          + Tambah tagihan rutin
        </button>` : ''}

      </div>` : ''}`;

    // Toggle handler — seluruh collapsed area bisa di-tap
    card.querySelector('#keuangan-toggle')?.addEventListener('click', () => {
      _keuanganExpanded = !_keuanganExpanded;
      render();
    });

    card.querySelector('#btn-goto-tagihan-card')?.addEventListener('click', () => {
      state.tabunganTab = 'tagihan';
      navigateTo('tabungan');
    });
  }

  render();
  container.appendChild(card);
}
