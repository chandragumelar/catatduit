// ===== DASHBOARD.JS — Orchestrator (v3 + Sprint B2 #16 card priority) =====

function buildTxItemHTML(tx) {
  const k      = getKategoriById(tx.kategori, tx.jenis);
  const prefix = tx.jenis === 'masuk' ? '+' : tx.jenis === 'nabung' ? '~' : '-';
  const cls    = tx.jenis === 'masuk' ? 'masuk' : tx.jenis === 'nabung' ? 'nabung' : 'keluar';
  const wallet = tx.wallet_id ? getWalletById(tx.wallet_id) : null;
  const walletTag = wallet && getWallets().length > 1
    ? `<span class="tx-wallet">${wallet.icon} ${escHtml(wallet.nama)}</span>`
    : '';
  // Sprint B2 #17: visual badge untuk transfer atomic
  const isTransfer  = tx.type === 'transfer_out' || tx.type === 'transfer_in';
  const transferTag = isTransfer
    ? `<span class="tx-transfer-badge">${tx.type === 'transfer_out' ? '↗' : '↙'} Transfer</span>`
    : '';
  return `<div class="tx-item" data-id="${tx.id}">
    <div class="tx-icon">${k.icon}</div>
    <div class="tx-info">
      <div class="tx-kategori">${escHtml(k.nama)}${walletTag}${transferTag}</div>
      ${tx.catatan ? `<div class="tx-catatan">${escHtml(tx.catatan)}</div>` : ''}
    </div>
    <div class="tx-right">
      <div class="tx-nominal ${cls}">${prefix}${formatRupiah(tx.nominal)}</div>
      <div class="tx-tanggal">${formatDate(tx.tanggal)}</div>
    </div>
  </div>`;
}

// ===== CARD SYSTEM (Sprint B2 #16) =====

function _makeCollapsibleCard({ id, title, titleRight = '', urgent = false, content }) {
  const collapsed = isCardCollapsed(id);
  const card      = document.createElement('div');
  card.className  = `card${urgent ? ' card--urgent' : ''}`;
  card.dataset.cardId = id;

  const header = document.createElement('div');
  header.className = 'card-collapsible-header';
  header.innerHTML = `
    <div class="card-collapsible-title">
      ${urgent ? '<span class="card-urgent-dot"></span>' : ''}
      <h3 class="section-title" style="margin:0">${escHtml(title)}</h3>
    </div>
    <div class="card-collapsible-right">
      ${titleRight}
      <span class="card-collapse-icon">${collapsed ? '▾' : '▴'}</span>
    </div>`;

  const body = document.createElement('div');
  body.className = 'card-collapsible-body';
  if (!collapsed) body.innerHTML = content;

  header.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button, select')) return;
    const nowCollapsed = !isCardCollapsed(id);
    setCardCollapsed(id, nowCollapsed);
    card.classList.toggle('card--collapsed', nowCollapsed);
    header.querySelector('.card-collapse-icon').textContent = nowCollapsed ? '▾' : '▴';
    body.innerHTML = nowCollapsed ? '' : content;
    if (!nowCollapsed) setTimeout(() => { initDashboardCharts(_lastCalc); if (window.lucide) lucide.createIcons(); }, 0);
  });

  card.appendChild(header);
  card.appendChild(body);
  return card;
}

// Cache calc untuk collapsible chart re-init
let _lastCalc = null;

// ===== MAIN RENDER =====

function renderDashboard() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  renderOnboardingChecklist('onboarding-checklist-wrap');

  const txList = getTransaksi();
  if (txList.length === 0) {
    Object.keys(state.chartInstances).forEach(k => destroyChart(k));
    container.innerHTML = buildEmptyState('💸', 'Belum ada catatan', 'Yuk mulai catat keuanganmu!', { label: 'Catat Pertamamu', onClick: null });
    container.querySelector('.empty-cta')?.addEventListener('click', () => openInputPage('add'));
    return;
  }

  const calc = calcDashboard();
  _lastCalc  = calc;

  const {
    year, month,
    totalMasuk, totalKeluar, totalNabung, cashflow,
    estimasiSaldo,
    trendText, trendClass,
    hariIni, hariDalamBulan, rataHarian, budgetHarian, spanHari,
    tagihan, tagihanBulanIni, tagihanSudahBayar, tagihanBelumBayar,
    totalTagihanBelumBayar, uangBebas, bebasDipakai,
    borosList, katSorted,
    sudahCatatHariIni, recentTx, bigSpending,
    velocityAlert, borosDay,
  } = calc;

  const insightText = getInsightText({ ...calc, nama: getNama() });

  // ===== Priority system =====
  const statusMap       = calcBudgetStatus();
  const hasBudgetJebol  = Object.values(statusMap).some(s => s.status === 'jebol');
  const hasBudgetWarn   = Object.values(statusMap).some(s => s.status === 'warning');
  const tomorrow        = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr     = tomorrow.toISOString().split('T')[0];
  const tagihanMendekat = (tagihanBelumBayar || []).some(t => t.jatuhTempo && t.jatuhTempo <= tomorrowStr);

  // sections: { id, el, priority }
  // priority kecil = lebih atas. Greeting (0) selalu pertama, Share (99) selalu terakhir.
  const sections = [];
  const push = (id, el, priority = 50) => el && sections.push({ id, el, priority });

  // — Greeting (fixed top) + Transfer shortcut (Sprint C #18)
  const wallets = getWallets();
  const showTransferBtn = wallets.length >= 2;
  const greetEl = document.createElement('div');
  greetEl.innerHTML = `
    <div class="greeting-section">
      <div class="greeting-top">
        <p class="greeting-text">Halo, ${escHtml(getNama())}! 👋</p>
        ${showTransferBtn ? `<button class="btn-transfer-shortcut" id="btn-open-transfer" title="Transfer antar dompet">
          <i data-lucide="arrow-left-right"></i> Transfer
        </button>` : ''}
      </div>
      <p class="insight-text">${escHtml(insightText)}</p>
    </div>`;
  push(DASHBOARD_CARDS.GREETING, greetEl, 0);

  // — Keuangan Bulan Ini (naik kalau tagihan mendekat)
  const keuanganEl = document.createElement('div');
  _renderKeuanganBulanIni(keuanganEl, {
    wallets: getWallets(), estimasiSaldo, totalNabung, totalTagihanBelumBayar,
    tagihanSudahBayar, tagihanBulanIni, uangBebas, bebasDipakai, tagihan,
  });
  push(DASHBOARD_CARDS.KEUANGAN, keuanganEl, tagihanMendekat ? 1 : 20);

  // — Health Score
  const healthEl = document.createElement('div');
  try { renderHealthScore(healthEl); } catch(e) {}
  push(DASHBOARD_CARDS.HEALTH, healthEl, 25);

  // — Cerita card
  const ceritaEl = document.createElement('div');
  try { renderCeritaCard(ceritaEl); } catch(e) {}
  push(DASHBOARD_CARDS.CERITA, ceritaEl, 30);

  // — Daily check-in
  const checkinEl = document.createElement('div');
  checkinEl.className = 'card checkin-card';
  checkinEl.dataset.cardId = DASHBOARD_CARDS.CHECKIN;
  if (!sudahCatatHariIni) {
    checkinEl.innerHTML = `<div class="checkin-icon">📝</div>
       <div class="checkin-info">
         <div class="checkin-title">Belum catat hari ini</div>
         <div class="checkin-sub">Yuk catat sekarang biar akurat.</div>
       </div>
       <button class="checkin-btn" id="btn-checkin-catat">Catat</button>`;
    push(DASHBOARD_CARDS.CHECKIN, checkinEl, 35);
  }

  // — Pace indicator
  if (totalMasuk > 0 || totalKeluar > 0) {
    const paceEl = document.createElement('div');
    paceEl.innerHTML = `
      <div class="card pace-card">
        <div class="pace-content">
          <div class="pace-left">
            <p class="pace-label">Pengeluaran rata-rata harian bulan ini</p>
            <p class="pace-value">Rata-rata pengeluaran <strong>${formatRupiah(rataHarian)}</strong><span class="pace-unit">/hari</span></p>
          </div>
          ${budgetHarian > 0 ? `
          <div class="pace-right">
            <p class="pace-label">Budget harian</p>
            <p class="pace-value ${rataHarian > budgetHarian ? 'expense' : 'income'}">${formatRupiah(budgetHarian)}</p>
          </div>` : ''}
        </div>
      </div>`;
    push('card-pace', paceEl, 40);
  }

  // — Velocity alert (naik ke 2 kalau aktif)
  if (velocityAlert) {
    const velEl = document.createElement('div');
    velEl.innerHTML = `
      <div class="card velocity-alert-card card--urgent">
        <div class="velocity-alert-icon">⚡</div>
        <div class="velocity-alert-body">
          <div class="velocity-alert-title">Kecepatan belanja tinggi</div>
          <div class="velocity-alert-sub">Baru hari ke-${velocityAlert.hariIni} dari ${velocityAlert.hariDalamBulan}, tapi sudah habis ${velocityAlert.spendPct}% dari pemasukan. Pace normal: ${velocityAlert.dayPct}%.</div>
        </div>
      </div>`;
    push(DASHBOARD_CARDS.VELOCITY, velEl, 2);
  }

  // — Cashflow summary
  const cashflowEl = document.createElement('div');
  cashflowEl.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card summary-card--main">
        <p class="summary-label">Cashflow Bulan Ini</p>
        <p class="summary-value ${cashflow >= 0 ? 'income' : 'expense'} summary-value--large">${formatRupiah(cashflow)}</p>
        <p class="summary-sub-label" style="color:var(--gray-400);">Masuk − keluar dari transaksi bulan ini</p>
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
    </div>`;
  push(DASHBOARD_CARDS.CASHFLOW, cashflowEl, 45);

  // — Catatan terakhir
  const recentCard = document.createElement('div');
  recentCard.className = 'card';
  recentCard.dataset.cardId = DASHBOARD_CARDS.RECENT;
  recentCard.innerHTML = `
    <div class="section-header"><h3 class="section-title">Catatan Terakhir</h3></div>
    ${recentTx.map(tx => buildTxItemHTML(tx)).join('')}
    <button class="section-link mt-8" id="btn-lihat-semua" style="display:block;padding:8px 0;">Lihat semua catatan →</button>`;
  push(DASHBOARD_CARDS.RECENT, recentCard, 50);

  // — Kategori terboros
  if (borosList.length > 0) {
    const borosEl = document.createElement('div');
    borosEl.className = 'card';
    borosEl.dataset.cardId = DASHBOARD_CARDS.BOROS;
    borosEl.innerHTML = `
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
    push(DASHBOARD_CARDS.BOROS, borosEl, 55);
  }

  // — Rolling Insight 2 minggu (Sprint C #19)
  // Selalu tampilkan card, tapi isi konten bergantung pada data di window 2 minggu
  {
    const rollingEl = _makeCollapsibleCard({
      id:      DASHBOARD_CARDS.ROLLING_INSIGHT,
      title:   '📊 Analisis 2 Minggu',
      urgent:  false,
      content: '<div id="rolling-insight-body" class="rolling-insight-wrap">Memuat...</div>',
    });
    push(DASHBOARD_CARDS.ROLLING_INSIGHT, rollingEl, 58);
  }

  // — Budget (naik ke 3 kalau jebol, 5 kalau warning)
  const budgetEl = document.createElement('div');
  try { renderBudgetSection(budgetEl); } catch(e) {}
  push(DASHBOARD_CARDS.BUDGET, budgetEl, hasBudgetJebol ? 3 : hasBudgetWarn ? 5 : 60);

  // — Charts (collapsible)
  const chartsEl = _makeCollapsibleCard({
    id:       DASHBOARD_CARDS.CHARTS,
    title:    'Grafik & Analitik',
    urgent:   false,
    content:  _buildChartsHTML(calc, katSorted, totalKeluar, borosDay),
  });
  push(DASHBOARD_CARDS.CHARTS, chartsEl, 80);

  // — Pengeluaran terbesar
  if (bigSpending.length > 0) {
    const bigEl = document.createElement('div');
    bigEl.className = 'card';
    bigEl.innerHTML = `
      <div class="section-header"><h3 class="section-title">Pengeluaran Terbesar Bulan Ini</h3></div>
      ${bigSpending.map((tx, i) => {
        const k = getKategoriById(tx.kategori, 'keluar');
        return `<div class="big-tx-item" data-id="${tx.id}">
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
    push('card-big', bigEl, 85);
  }

  // — Share (fixed bottom)
  const shareEl = document.createElement('div');
  shareEl.innerHTML = `
    <div class="card">
      <button class="btn-share" id="btn-share-summary">
        <i data-lucide="share-2"></i> Bagikan Ringkasan Bulan Ini
      </button>
    </div>`;
  push('card-share', shareEl, 99);

  // ===== Sort by priority → render =====
  container.innerHTML = '';
  sections.sort((a, b) => a.priority - b.priority).forEach(({ el }) => container.appendChild(el));

  // Priority banner (inserted after greeting)
  const urgentMsgs = [];
  if (hasBudgetJebol) urgentMsgs.push('Budget jebol!');
  if (velocityAlert)  urgentMsgs.push(`Belanja ${velocityAlert.spendPct}% dari pemasukan`);
  if (tagihanMendekat) urgentMsgs.push('Tagihan jatuh tempo besok');
  if (urgentMsgs.length > 0) {
    const banner = document.createElement('div');
    banner.className = 'priority-banner';
    banner.innerHTML = `<span>🔔</span><span>${urgentMsgs.join(' · ')}</span>`;
    const greetNode = container.querySelector('.greeting-section')?.closest('div');
    if (greetNode?.nextSibling) container.insertBefore(banner, greetNode.nextSibling);
    else container.appendChild(banner);
  }

  // Event listeners
  container.querySelector('#btn-open-transfer')?.addEventListener('click', () => openTransferSheet());
  container.querySelector('#btn-checkin-catat')?.addEventListener('click', () => openInputPage('add'));
  container.querySelector('#btn-lihat-semua')?.addEventListener('click', () => navigateTo('riwayat'));
  container.querySelectorAll('.tx-item').forEach(el =>
    el.addEventListener('click', () => openInputPage('edit', el.dataset.id)));
  container.querySelectorAll('.big-tx-item').forEach(el =>
    el.addEventListener('click', () => openInputPage('edit', el.dataset.id)));
  container.querySelector('#btn-share-summary')?.addEventListener('click', () =>
    showShareSummary(getNama(), year, month, totalMasuk, totalKeluar, cashflow, totalNabung, borosList));

  setTimeout(() => {
    initDashboardCharts(calc);
    // Rolling insight render — setelah DOM ready
    const rollingBody = container.querySelector('#rolling-insight-body');
    if (rollingBody && typeof renderRollingInsightCard === 'function') {
      renderRollingInsightCard('rolling-insight-body', txList);
    }
    if (window.lucide) lucide.createIcons();
  }, 0);
}

// ===== CHARTS HTML =====

function _buildChartsHTML(calc, katSorted, totalKeluar, borosDay) {
  const allKeluar  = getKategori().keluar;
  const defaultKat = allKeluar[0]?.id || 'makan';

  return `
    <div class="section-header" style="margin-top:4px;margin-bottom:8px;">
      <h3 class="section-title">Pemasukan vs Pengeluaran</h3>
      <div class="chart-period-toggle">
        <button class="chart-period-btn active" data-period="monthly">Bulanan</button>
        <button class="chart-period-btn" data-period="weekly">Mingguan</button>
      </div>
    </div>
    <div class="chart-container"><canvas id="chart-combo"></canvas></div>
    <p class="chart-week-note" id="chart-week-note" style="display:none;font-size:11px;color:var(--gray-400);text-align:center;margin-top:4px;">W = minggu · W0 = minggu ini · W-1 = minggu lalu</p>

    <div class="section-header" style="margin-top:16px;margin-bottom:8px;">
      <h3 class="section-title">Cashflow per Bulan</h3>
    </div>
    <div class="chart-container"><canvas id="chart-surplus"></canvas></div>

    ${katSorted.length > 0 ? `
    <div class="section-header" style="margin-top:16px;margin-bottom:8px;">
      <h3 class="section-title">Pengeluaran per Kategori</h3>
    </div>
    <div class="chart-container" style="height:${Math.max(160, katSorted.length * 36)}px"><canvas id="chart-kategori"></canvas></div>
    <table class="category-table" style="margin-top:12px;">
      <thead><tr><th>Kategori</th><th>Total</th><th>%</th></tr></thead>
      <tbody>
        ${katSorted.map(([id, val], i) => {
          const k   = getKategoriById(id, 'keluar');
          const pct = totalKeluar > 0 ? Math.round((val / totalKeluar) * 100) : 0;
          return `<tr>
            <td><span class="category-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>${escHtml(k.icon)} ${escHtml(k.nama)}</td>
            <td>${formatRupiah(val)}</td><td>${pct}%</td></tr>`;
        }).join('')}
      </tbody>
    </table>` : ''}

    <div class="section-header" style="margin-top:16px;margin-bottom:8px;">
      <h3 class="section-title">Tren Kategori</h3>
      <select class="tren-select" id="tren-kategori-select">
        ${allKeluar.map(k => `<option value="${k.id}" ${k.id === defaultKat ? 'selected' : ''}>${k.icon} ${escHtml(k.nama)}</option>`).join('')}
      </select>
    </div>
    <div class="chart-container"><canvas id="chart-tren"></canvas></div>

    ${borosDay ? `
    <div class="section-header" style="margin-top:16px;margin-bottom:8px;">
      <h3 class="section-title">Pola Pengeluaran per Hari</h3>
    </div>
    <div class="chart-container"><canvas id="chart-dow"></canvas></div>
    <p class="chart-dow-label">Terboros: <strong>${borosDay}</strong></p>` : ''}
  `;
}

// ===== KEUANGAN BULAN INI (collapsible) =====

let _keuanganExpanded = false;

function _renderKeuanganBulanIni(container, {
  wallets, estimasiSaldo, totalNabung, totalTagihanBelumBayar,
  tagihanSudahBayar, tagihanBulanIni, uangBebas, bebasDipakai, tagihan,
}) {
  const hasRincian = totalTagihanBelumBayar > 0 || totalNabung > 0;
  const heroAngka  = hasRincian ? bebasDipakai : estimasiSaldo;
  const heroClass  = heroAngka >= 0 ? 'income' : 'expense';

  const card = document.createElement('div');
  card.className = 'card keuangan-card';
  card.id = 'keuangan-bulan-ini-card';
  card.dataset.cardId = DASHBOARD_CARDS.KEUANGAN;

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
      <div class="keuangan-detail">
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
          <span>Total saldo</span><span>${formatRupiah(estimasiSaldo)}</span>
        </div>
        ${totalTagihanBelumBayar > 0 ? `
        <div class="keuangan-row keuangan-row--minus">
          <span>Tagihan belum dibayar</span><span>− ${formatRupiah(totalTagihanBelumBayar)}</span>
        </div>
        <div class="keuangan-divider"></div>
        <div class="keuangan-row keuangan-row--result">
          <span>Setelah tagihan</span>
          <span class="${uangBebas >= 0 ? 'income' : 'expense'}">${formatRupiah(uangBebas)}</span>
        </div>` : ''}
        ${totalNabung > 0 ? `
        <div class="keuangan-row keuangan-row--minus">
          <span>Nabung bulan ini</span><span>− ${formatRupiah(totalNabung)}</span>
        </div>
        <div class="keuangan-divider"></div>
        <div class="keuangan-row keuangan-row--result keuangan-row--final">
          <span>Bebas dipakai <span style="font-size:10px;font-weight:400;color:var(--gray-400);display:block;">dari total saldo − tagihan − nabung</span></span>
          <span class="${bebasDipakai >= 0 ? 'income' : 'expense'}">${formatRupiah(bebasDipakai)}</span>
        </div>` : ''}
        ${tagihanBulanIni.length > 0 ? `
        <p class="tagihan-paid-status">
          ${tagihanSudahBayar.length === tagihanBulanIni.length
            ? '✅ Semua tagihan bulan ini sudah beres!'
            : tagihanSudahBayar.length === 0
              ? `${tagihanBulanIni.length} tagihan bulan ini belum dibayar`
              : `${tagihanBulanIni.length - tagihanSudahBayar.length} dari ${tagihanBulanIni.length} tagihan belum dibayar`}
        </p>` : tagihan.length === 0 ? `
        <button class="btn-text-small" id="btn-goto-tagihan-card" style="margin-top:8px;">
          + Tambah tagihan rutin
        </button>` : ''}
      </div>` : ''}`;

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

// Helper
function _appendHTML(container, html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  while (tmp.firstChild) container.appendChild(tmp.firstChild);
}
