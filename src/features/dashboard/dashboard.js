// =============================================================================
// DASHBOARD.JS
// Tanggung jawab: Orkestrasi halaman dashboard — memanggil semua sub-renderer
// Depends on: state.js, storage.js, ui.js, dashboard.calc.js, dashboard.cards.js, dashboard.chart.js, dashboard.insight.js, health-score.js, insight.rolling.js
// =============================================================================


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
  const tagihanMendekatList = (tagihanBelumBayar || []).filter(t => t.jatuhTempo && t.jatuhTempo <= tomorrowStr);
  const tagihanMendekat = tagihanMendekatList.length > 0;

  // sections: { id, el, priority }
  // priority kecil = lebih atas. Greeting (0) selalu pertama, Share (99) selalu terakhir.
  const sections = [];
  const push = (id, el, priority = 50) => el && sections.push({ id, el, priority });

  // — Greeting
  push(DASHBOARD_CARDS.GREETING, buildGreetingCard(insightText, getNama()), 0);

  // — Support banner (muncul setiap 7 hari, priority 2 = tepat di bawah greeting)
  push(DASHBOARD_CARDS.SUPPORT, buildSupportBannerCard(), 2);

  // — Keuangan Bulan Ini (naik ke priority 1 kalau ada tagihan mendekat)
  const keuanganEl = document.createElement('div');
  keuanganEl.appendChild(buildKeuanganCard({
    wallets: getWallets(), estimasiSaldo, totalNabung, totalTagihanBelumBayar,
    tagihanSudahBayar, tagihanBulanIni, uangBebas, bebasDipakai, tagihan,
  }));
  push(DASHBOARD_CARDS.KEUANGAN, keuanganEl, tagihanMendekat ? 1 : 20);

  // — Health Score
  const healthEl = document.createElement('div');
  try { renderHealthScore(healthEl); } catch {}
  push(DASHBOARD_CARDS.HEALTH, healthEl, 25);

  // — Cerita card
  const ceritaEl = document.createElement('div');
  try { renderCeritaCard(ceritaEl); } catch {}
  push(DASHBOARD_CARDS.CERITA, ceritaEl, 30);

  // — Daily check-in
  if (!sudahCatatHariIni) {
    push(DASHBOARD_CARDS.CHECKIN, buildCheckinCard(), 35);
  }

  // — Pace indicator
  if (totalMasuk > 0 || totalKeluar > 0) {
  }

  // — Velocity alert (naik ke 2 kalau aktif)
  if (velocityAlert) {
    push(DASHBOARD_CARDS.VELOCITY, buildVelocityCard(velocityAlert), 2);
  }

  // — Cashflow summary
  push(DASHBOARD_CARDS.CASHFLOW, buildCashflowCard({ cashflow, totalMasuk, totalKeluar, totalNabung, trendText, trendClass }), 45);

  // — Catatan terakhir
  push(DASHBOARD_CARDS.RECENT, buildRecentCard(recentTx), 98);

  // — Kategori terboros / Pengeluaran terbesar (merged card, default monthly)
  if (borosList.length > 0 || bigSpending.length > 0) {
    push(DASHBOARD_CARDS.BOROS, buildSpendingCard(calc, 'monthly'), 55);
  }

  // — Budget (naik ke 3 kalau jebol, 5 kalau warning)
  const budgetEl = document.createElement('div');
  try { renderBudgetSection(budgetEl); } catch {}
  push(DASHBOARD_CARDS.BUDGET, budgetEl, hasBudgetJebol ? 3 : hasBudgetWarn ? 5 : 60);

  // — Charts (collapsible)
  const chartsEl = _makeCollapsibleCard({
    id:      DASHBOARD_CARDS.CHARTS,
    title:   'Grafik & Analitik',
    urgent:  false,
    content: _buildChartsHTML(calc, katSorted, totalKeluar, borosDay),
  });
  push(DASHBOARD_CARDS.CHARTS, chartsEl, 80);

  // — Share (fixed bottom)
  push('card-share', buildShareCard(), 99);

  // ===== Sort by priority → render =====
  container.innerHTML = '';
  sections.sort((a, b) => a.priority - b.priority).forEach(({ el }) => container.appendChild(el));

  // Inject currency toggle setelah greeting card
  const greetingEl = container.querySelector('.greeting-section');
  const toggleWrap = document.createElement('div');
  toggleWrap.id = 'currency-toggle-container';
  if (greetingEl) {
    greetingEl.closest('div')?.after(toggleWrap);
  } else {
    container.insertBefore(toggleWrap, container.firstChild);
  }

  // Priority banner (inserted at very top, above all cards)
  // Semua kondisi dikumpulkan lalu dirangkai jadi 1 kalimat natural
  const _bannerParts = [];

  if (hasBudgetJebol) {
    const jebolNames = Object.entries(statusMap)
      .filter(([, s]) => s.status === 'jebol')
      .map(([id]) => { try { return getKategoriById(id, 'keluar').nama; } catch(e) { return id; } });
    if (jebolNames.length === 1) _bannerParts.push(`budget ${jebolNames[0]} jebol`);
    else if (jebolNames.length > 1) _bannerParts.push(`budget ${jebolNames.slice(0,-1).join(', ')} & ${jebolNames[jebolNames.length-1]} jebol`);
    else _bannerParts.push('budget jebol');
  }

  if (velocityAlert) {
    _bannerParts.push(`belanja udah ${velocityAlert.spendPct}% dari pemasukan`);
  }

  if (tagihanMendekat) {
    const todayStr    = new Date().toISOString().split('T')[0];
    const hariIniList = tagihanMendekatList.filter(t => t.jatuhTempo === todayStr);
    const besokList   = tagihanMendekatList.filter(t => t.jatuhTempo !== todayStr);

    const _joinNames = (arr) => {
      const names = arr.map(t => t.nama);
      if (names.length === 1) return names[0];
      return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
    };

    const parts = [];
    if (hariIniList.length > 0) parts.push(`tagihan ${_joinNames(hariIniList)} jatuh tempo hari ini`);
    if (besokList.length > 0)   parts.push(`tagihan ${_joinNames(besokList)} jatuh tempo besok`);
    if (parts.length === 1) _bannerParts.push(parts[0]);
    else _bannerParts.push(parts.join(', '));
  }

  if (_bannerParts.length > 0) {
    // Rangkai jadi 1 kalimat: "A, B, dan C"
    let bannerText;
    if (_bannerParts.length === 1) {
      bannerText = _bannerParts[0].charAt(0).toUpperCase() + _bannerParts[0].slice(1) + '.';
    } else {
      const last = _bannerParts[_bannerParts.length - 1];
      const rest = _bannerParts.slice(0, -1);
      bannerText = rest.map((s, i) => i === 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s).join(', ') + ', dan ' + last + '.';
    }
    const banner = document.createElement('div');
    banner.className = 'priority-banner';
    banner.innerHTML = `<span>🔔</span><span>${bannerText}</span>`;
    container.insertBefore(banner, container.firstChild);
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

  // Multicurrency toggle events
  _initCurrencyToggleEvents();

  setTimeout(() => {
    initDashboardCharts(calc);
    if (window.lucide) lucide.createIcons();
  }, 0);
}

// ===== CURRENCY TOGGLE =====

function _initCurrencyToggleEvents() {
  const wrap = document.getElementById('currency-toggle-container');
  if (!wrap) return;

  if (!isMulticurrencyEnabled() || !getSecondaryCurrency()) {
    wrap.innerHTML = '';
    return;
  }

  wrap.innerHTML = buildCurrencyToggleHTML();

  // Set CSS vars untuk lebar thumb sesuai teks label masing-masing btn
  requestAnimationFrame(() => {
    const track = wrap.querySelector('#currency-toggle-track');
    const btns  = wrap.querySelectorAll('.currency-toggle-btn');
    if (track && btns.length === 2) {
      track.style.setProperty('--thumb-base-w', btns[0].offsetWidth + 'px');
      track.style.setProperty('--thumb-sec-w',  btns[1].offsetWidth + 'px');
    }
  });

  // Toggle buttons
  wrap.querySelectorAll('.currency-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.toggle;
      // Update data-active + active class dulu biar animasi smooth
      const track = wrap.querySelector('#currency-toggle-track');
      if (track) track.dataset.active = val;
      wrap.querySelectorAll('.currency-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.toggle === val));
      setActiveCurrencyToggle(val);
      renderDashboard();
    });
  });
}
