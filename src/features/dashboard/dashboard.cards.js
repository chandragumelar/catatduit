// ===== DASHBOARD.CARDS.JS — Card builders (refactored dari dashboard.js) =====

function buildTxItemHTML(tx) {
  const k      = getKategoriById(tx.kategori, tx.jenis);
  const prefix = tx.jenis === 'masuk' ? '+' : tx.jenis === 'nabung' ? '~' : '-';
  const cls    = tx.jenis === 'masuk' ? 'masuk' : tx.jenis === 'nabung' ? 'nabung' : 'keluar';
  const wallet = tx.wallet_id ? getWalletById(tx.wallet_id) : null;
  const walletTag = wallet && getWallets().length > 1
    ? `<span class="tx-wallet">${wallet.icon} ${escHtml(wallet.nama)}</span>`
    : '';
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

// ===== COLLAPSIBLE CARD SYSTEM =====

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

// ===== GREETING CARD =====

function buildGreetingCard(insightText, nama) {
  const wallets = getWallets();
  const showTransferBtn = wallets.length >= 2;
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="greeting-section">
      <div class="greeting-top">
        <p class="greeting-text">Halo, ${escHtml(nama)}! 👋</p>
        ${showTransferBtn ? `<button class="btn-transfer-shortcut" id="btn-open-transfer" title="Pindah saldo antar dompet">
          <i data-lucide="arrow-left-right"></i> Pindah Dompet
        </button>` : ''}
      </div>
    </div>`;
  return el;
}

// ===== VELOCITY ALERT CARD =====

function buildVelocityCard(velocityAlert) {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="card velocity-alert-card card--urgent">
      <div class="velocity-alert-icon">⚡</div>
      <div class="velocity-alert-body">
        <div class="velocity-alert-title">Kecepatan belanja tinggi</div>
        <div class="velocity-alert-sub">Baru hari ke-${velocityAlert.hariIni} dari ${velocityAlert.hariDalamBulan}, tapi sudah habis ${velocityAlert.spendPct}% dari pemasukan. Pace normal: ${velocityAlert.dayPct}%.</div>
      </div>
    </div>`;
  return el;
}

// ===== CASHFLOW CARD =====

function buildCashflowCard({ cashflow, totalMasuk, totalKeluar, totalNabung, trendText, trendClass }) {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card summary-card--main">
        <p class="summary-label">Cashflow Bulan Ini</p>
        <p class="summary-value ${cashflow >= 0 ? 'income' : 'expense'} summary-value--large">${formatRupiah(cashflow)}</p>
        <p class="summary-sub-label" style="color:var(--gray-400);">Pemasukan dikurangi pengeluaran bulan ini</p>
        <p class="summary-sub-label" style="color:var(--gray-400);font-size:0.75rem;">Tidak termasuk saldo awal dompet</p>
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
  return el;
}

// ===== PACE CARD =====

function buildPaceCard({ rataHarian, budgetHarian }) {
  const el = document.createElement('div');

  let paceStory = '';
  if (budgetHarian > 0) {
    const ratio = rataHarian / budgetHarian;
    const ratioLabel = ratio.toFixed(1);
    if (ratio <= 1) {
      paceStory = `Lo belanja <strong>${formatRupiah(rataHarian)}/hari</strong> — masih di bawah budget harian (${formatRupiah(budgetHarian)}). ✅`;
    } else if (ratio <= 1.5) {
      paceStory = `Lo belanja <strong>${formatRupiah(rataHarian)}/hari</strong> — ${ratioLabel}× budget harian lo (${formatRupiah(budgetHarian)}). Sedikit over.`;
    } else if (ratio <= 3) {
      paceStory = `Lo belanja <strong>${formatRupiah(rataHarian)}/hari</strong> — ${ratioLabel}× di atas budget harian (${formatRupiah(budgetHarian)}). ⚠️ Perlu dikurangi.`;
    } else {
      paceStory = `Lo belanja <strong>${formatRupiah(rataHarian)}/hari</strong> — ${ratioLabel}× budget harian lo (${formatRupiah(budgetHarian)}). 🚨 Jauh banget dari target.`;
    }
  } else {
    paceStory = `Rata-rata pengeluaran <strong>${formatRupiah(rataHarian)}/hari</strong> bulan ini.`;
  }

  el.innerHTML = `
    <div class="card pace-card">
      <p class="pace-label">Pengeluaran rata-rata harian</p>
      <p class="pace-story">${paceStory}</p>
    </div>`;
  return el;
}

// ===== RECENT TX CARD =====

function buildRecentCard(recentTx) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.cardId = DASHBOARD_CARDS.RECENT;
  card.innerHTML = `
    <div class="section-header"><h3 class="section-title">Catatan Terakhir</h3></div>
    ${recentTx.map(tx => buildTxItemHTML(tx)).join('')}
    <button class="section-link mt-8" id="btn-lihat-semua" style="display:block;padding:8px 0;">Lihat semua catatan →</button>`;
  return card;
}

// ===== BOROS CARD =====

// ===== SPENDING CARD (merged: bulanan = per kategori, mingguan = per transaksi) =====

function buildSpendingCard(calc, period) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.cardId = DASHBOARD_CARDS.BOROS;
  el.innerHTML = _buildSpendingCardHTML(calc, period);
  return el;
}

function _buildSpendingCardHTML(calc, period) {
  if (period === 'weekly') {
    const { bigSpendingWeekly } = calc;
    if (!bigSpendingWeekly || bigSpendingWeekly.length === 0)
      return `<div class="section-header"><h3 class="section-title" id="spending-card-label">Pengeluaran Terbesar · Minggu Ini</h3></div><p style="color:var(--color-text-tertiary);font-size:13px;">Belum ada pengeluaran minggu ini.</p>`;
    return `
      <div class="section-header"><h3 class="section-title" id="spending-card-label">Pengeluaran Terbesar · Minggu Ini</h3></div>
      ${bigSpendingWeekly.map((tx, i) => {
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
  } else {
    const { borosList } = calc;
    if (!borosList || borosList.length === 0)
      return `<div class="section-header"><h3 class="section-title" id="spending-card-label">Kategori Terboros · Bulan Ini</h3></div><p style="color:var(--color-text-tertiary);font-size:13px;">Belum ada pengeluaran bulan ini.</p>`;
    return `
      <div class="section-header"><h3 class="section-title" id="spending-card-label">Kategori Terboros · Bulan Ini</h3></div>
      ${borosList.map(({ id, val, badge, badgeText }) => {
        const k = getKategoriById(id, 'keluar');
        return `<div class="boros-item">
          <div class="boros-icon">${k.icon}</div>
          <div class="boros-info">
            <div class="boros-nama">${escHtml(k.nama)}</div>
            <div class="boros-sub">${formatRupiah(val)}</div>
          </div>
          ${badge ? `<span class="boros-badge ${badge}">${badgeText}</span>` : ''}
        </div>`;
      }).join('')}`;
  }
}

// ===== SHARE CARD =====

function buildShareCard() {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="card">
      <button class="btn-share" id="btn-share-summary">
        <i data-lucide="share-2"></i> Bagikan Ringkasan Bulan Ini
      </button>
    </div>`;
  return el;
}

// ===== CHECKIN CARD =====

function buildCheckinCard() {
  const el = document.createElement('div');
  el.className = 'card checkin-card';
  el.dataset.cardId = DASHBOARD_CARDS.CHECKIN;
  el.innerHTML = `<div class="checkin-icon">📝</div>
     <div class="checkin-info">
       <div class="checkin-title">Belum catat hari ini</div>
       <div class="checkin-sub">Yuk catat sekarang biar akurat.</div>
     </div>
     <button class="checkin-btn" id="btn-checkin-catat">Catat</button>`;
  return el;
}

// ===== KEUANGAN BULAN INI =====

let _keuanganExpanded = false;

function buildKeuanganCard({
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
          <span>Uang bebas <span style="font-size:10px;font-weight:400;color:var(--gray-400);">· setelah tagihan &amp; nabung</span></span>
          <span class="${bebasDipakai >= 0 ? 'income' : 'expense'}">${formatRupiah(bebasDipakai)}</span>
        </div>` : ''}
        ${tagihanBulanIni.length > 0 ? `
        <p class="tagihan-paid-status keuangan-row--sub" style="margin-top:4px;">
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
  return card;
}

// ===== _buildChartsHTML — HTML untuk section grafik =====
function _buildChartsHTML(calc, katSorted, totalKeluar, borosDay) {
  const allKeluar = getKategori().keluar;

  const katOptions = allKeluar.map(k =>
    `<option value="${k.id}">${k.icon} ${k.nama}</option>`
  ).join('');

  const katH = Math.max(120, katSorted.length * 32);

  return `
    <div class="chart-block">
      <div class="chart-period-wrap">
        <button class="chart-period-btn active" data-period="monthly">Bulanan</button>
        <button class="chart-period-btn" data-period="weekly">Mingguan</button>
      </div>
      <p id="chart-combo-label" class="chart-label">Masuk &amp; Keluar per Bulan</p>
      <div style="position:relative;height:180px;">
        <canvas id="chart-combo"></canvas>
      </div>

    </div>

    <div class="chart-block" style="margin-top:24px;">
      <p id="chart-cashflow-label" class="chart-label">Cashflow per Bulan</p>
      <div style="position:relative;height:160px;">
        <canvas id="chart-surplus"></canvas>
      </div>
    </div>

    ${katSorted.length > 0 ? `
    <div class="chart-block" style="margin-top:24px;">
      <p id="chart-kategori-label" class="chart-label">Pengeluaran per Kategori · Bulan Ini</p>
      <div style="position:relative;height:${katH}px;">
        <canvas id="chart-kategori"></canvas>
      </div>
    </div>` : ''}

    <div class="chart-block" style="margin-top:24px;">
      <p id="chart-tren-label" class="chart-label">Tren per Kategori · 12 Bulan</p>
      <select id="tren-kategori-select" class="select-small" style="margin-bottom:8px;">${katOptions}</select>
      <div style="position:relative;height:160px;">
        <canvas id="chart-tren"></canvas>
      </div>
    </div>

    ${borosDay ? `
    <div class="chart-block" style="margin-top:24px;">
      <p class="chart-label">Pengeluaran per Hari</p>
      <div style="position:relative;height:160px;">
        <canvas id="chart-dow"></canvas>
      </div>
    </div>` : ''}
  `;
}
