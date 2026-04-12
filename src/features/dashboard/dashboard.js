// ===== DASHBOARD.JS — Orchestrator =====

// Cache calc untuk collapsible chart re-init
let _lastCalc = null;

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
    estimasiSaldo, trendText, trendClass,
    hariIni, rataHarian, budgetHarian,
    tagihan, tagihanBulanIni, tagihanSudahBayar, tagihanBelumBayar,
    totalTagihanBelumBayar, uangBebas, bebasDipakai,
    borosList, katSorted,
    sudahCatatHariIni, recentTx, bigSpending,
    velocityAlert, borosDay,
  } = calc;

  const insightText = getInsightText({ ...calc, nama: getNama() });

  // ===== Priority system =====
  const statusMap      = calcBudgetStatus();
  const hasBudgetJebol = Object.values(statusMap).some(s => s.status === 'jebol');
  const hasBudgetWarn  = Object.values(statusMap).some(s => s.status === 'warning');
  const tomorrow       = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr    = tomorrow.toISOString().split('T')[0];
  const tagihanMendekat = (tagihanBelumBayar || []).some(t => t.jatuhTempo && t.jatuhTempo <= tomorrowStr);

  // sections: { id, el, priority }
  // priority kecil = lebih atas. Greeting (0) selalu pertama, Share (99) selalu terakhir.
  const sections = [];
  const push = (id, el, priority = 50) => el && sections.push({ id, el, priority });

  // — Greeting
  push(DASHBOARD_CARDS.GREETING, buildGreetingCard(insightText, getNama()), 0);

  // — Keuangan Bulan Ini (naik ke priority 1 kalau ada tagihan mendekat)
  const keuanganEl = document.createElement('div');
  keuanganEl.appendChild(buildKeuanganCard({
    wallets: getWallets(), estimasiSaldo, totalNabung, totalTagihanBelumBayar,
    tagihanSudahBayar, tagihanBulanIni, uangBebas, bebasDipakai, tagihan,
  }));
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
  if (!sudahCatatHariIni) {
    push(DASHBOARD_CARDS.CHECKIN, buildCheckinCard(), 35);
  }

  // — Pace indicator
  if (totalMasuk > 0 || totalKeluar > 0) {
    push('card-pace', buildPaceCard({ rataHarian, budgetHarian }), 40);
  }

  // — Velocity alert (naik ke 2 kalau aktif)
  if (velocityAlert) {
    push(DASHBOARD_CARDS.VELOCITY, buildVelocityCard(velocityAlert), 2);
  }

  // — Cashflow summary
  push(DASHBOARD_CARDS.CASHFLOW, buildCashflowCard({ cashflow, totalMasuk, totalKeluar, totalNabung, trendText, trendClass }), 45);

  // — Catatan terakhir
  push(DASHBOARD_CARDS.RECENT, buildRecentCard(recentTx), 50);

  // — Kategori terboros
  if (borosList.length > 0) {
    push(DASHBOARD_CARDS.BOROS, buildBorosCard(borosList), 55);
  }

  // — Budget (naik ke 3 kalau jebol, 5 kalau warning)
  const budgetEl = document.createElement('div');
  try { renderBudgetSection(budgetEl); } catch(e) {}
  push(DASHBOARD_CARDS.BUDGET, budgetEl, hasBudgetJebol ? 3 : hasBudgetWarn ? 5 : 60);

  // — Charts (collapsible)
  const chartsEl = _makeCollapsibleCard({
    id:      DASHBOARD_CARDS.CHARTS,
    title:   'Grafik & Analitik',
    urgent:  false,
    content: _buildChartsHTML(calc, katSorted, totalKeluar, borosDay),
  });
  push(DASHBOARD_CARDS.CHARTS, chartsEl, 80);

  // — Pengeluaran terbesar
  if (bigSpending.length > 0) {
    push('card-big', buildBigSpendingCard(bigSpending), 85);
  }

  // — Share (fixed bottom)
  push('card-share', buildShareCard(), 99);

  // ===== Sort by priority → render =====
  container.innerHTML = '';
  sections.sort((a, b) => a.priority - b.priority).forEach(({ el }) => container.appendChild(el));

  // Priority banner (inserted after greeting)
  const urgentMsgs = [];
  if (hasBudgetJebol)  urgentMsgs.push('Budget jebol!');
  if (velocityAlert)   urgentMsgs.push(`Belanja ${velocityAlert.spendPct}% dari pemasukan`);
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
    if (window.lucide) lucide.createIcons();
  }, 0);
}
