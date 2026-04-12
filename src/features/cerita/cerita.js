// =============================================================================
// CERITA.JS
// Tanggung jawab: Orkestrasi Cerita Bulan Ini — entry point dan flow controller
// Depends on: state.js, storage.js, cerita.data.js, cerita.slides.js, cerita.share.js
// =============================================================================

// Dependencies: cerita.data.js, cerita.slides.js, cerita.share.js

function openCerita(year, month) {
  document.getElementById('cerita-overlay')?.remove();

  const data      = calcCeritaData(year, month);
  const bulanNama = BULAN_NAMES[month];

  const overlay = document.createElement('div');
  overlay.id        = 'cerita-overlay';
  overlay.className = 'cerita-overlay';

  overlay.innerHTML = `
    <div class="cerita-sheet" id="cerita-sheet">
      <div class="cerita-topbar">
        ${_buildMonthSelect(year, month)}
        <button class="cerita-close" id="cerita-close">✕</button>
      </div>
      <div class="cerita-body" id="cerita-body">
        ${data.ready
          ? buildCeritaSlides(data, bulanNama, year)
          : _renderEmpty(data)}
      </div>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  _bindEvents(overlay, data, bulanNama, year);
  if (data.ready) initCarousel(() => generateShareImage(data, bulanNama, year));
}

function _bindEvents(overlay, data, bulanNama, year) {
  document.getElementById('cerita-close').addEventListener('click', () => _closeOverlay(overlay));
  overlay.addEventListener('click', e => { if (e.target === overlay) _closeOverlay(overlay); });
  document.getElementById('cerita-month-select')?.addEventListener('change', e => {
    const [y, m] = e.target.value.split('-').map(Number);
    overlay.remove();
    openCerita(y, m);
  });
}

function _closeOverlay(overlay) {
  overlay.classList.remove('show');
  setTimeout(() => overlay.remove(), 300);
}

function _buildMonthSelect(year, month) {
  const now = new Date();
  const options = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const txCount = getTransaksi().filter(tx => isSameMonth(tx.tanggal, y, m)).length;
    if (txCount > 0) {
      const sel = y === year && m === month ? 'selected' : '';
      options.push(`<option value="${y}-${m}" ${sel}>${BULAN_NAMES[m]} ${y}</option>`);
    }
  }
  return `<select class="cerita-filter" id="cerita-month-select">${options.join('')}</select>`;
}

function _renderEmpty(data) {
  return `
    <div class="cerita-empty">
      <div class="cerita-empty-icon">📖</div>
      <p class="cerita-empty-title">Ceritanya belum lengkap</p>
      <p class="cerita-empty-desc">
        ${data.txCount === 0
          ? 'Belum ada catatan di bulan ini.'
          : `Baru ${data.txCount} catatan. Tambah ${CERITA_MIN_TX - data.txCount} lagi biar ceritanya lebih lengkap.`}
      </p>
    </div>`;
}

// ===== DASHBOARD CARD =====

function renderCeritaCard(container) {
  const { year, month } = getCurrentMonthYear();
  const txBulanIni = getTransaksi().filter(tx => isSameMonth(tx.tanggal, year, month));
  if (txBulanIni.length < CERITA_MIN_TX) return;

  const bulanNama = BULAN_NAMES[month];
  const card = document.createElement('div');
  card.className = 'card cerita-dashboard-card';
  card.innerHTML = `
    <div class="cerita-card-inner">
      <div>
        <p class="cerita-card-label">✨ Cerita bulan ${bulanNama} siap dibaca</p>
        <p class="cerita-card-sub">Kamu sudah catat ${txBulanIni.length} transaksi bulan ini.</p>
      </div>
      <span class="cerita-card-arrow">→</span>
    </div>`;
  card.addEventListener('click', () => openCerita(year, month));
  container.appendChild(card);
}
