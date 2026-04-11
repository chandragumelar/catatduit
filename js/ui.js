// ===== UI.JS — Toast, Modal, Navigation =====

// ===== TOAST =====
let toastTimer = null;
function showToast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

// ===== MODAL =====
function showModal(message, onConfirm, confirmText = 'Ya, Lanjutkan', isDanger = true) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-message').textContent = message;
  const btnC = document.getElementById('modal-confirm');
  btnC.textContent = confirmText;
  btnC.style.background = isDanger ? 'var(--red)' : 'var(--teal)';
  overlay.classList.add('show');
  const close = () => overlay.classList.remove('show');
  btnC.onclick = () => { close(); onConfirm(); };
  document.getElementById('modal-cancel').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

// ===== NAVIGATION =====
const ALL_PAGES = ['dashboard', 'riwayat', 'input', 'settings', 'kategori', 'tabungan'];
const PAGES_NO_NAV = ['input', 'kategori'];

function navigateTo(page) {
  ALL_PAGES.forEach(p => {
    document.getElementById(`page-${p}`)?.classList.remove('active');
  });
  document.getElementById(`page-${page}`)?.classList.add('active');
  state.currentPage = page;

  // Bottom nav active state
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (page === 'dashboard') document.getElementById('nav-dashboard')?.classList.add('active');
  if (page === 'settings') document.getElementById('nav-settings')?.classList.add('active');
  if (page === 'tabungan') document.getElementById('nav-tabungan')?.classList.add('active');

  const hideNav = PAGES_NO_NAV.includes(page);
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = hideNav ? 'none' : 'flex';

  // Adjust page bottom padding
  ALL_PAGES.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) el.style.bottom = hideNav ? '0' : 'var(--nav-height)';
  });

  // Render page content
  if (page === 'dashboard') renderDashboard();
  if (page === 'riwayat') renderRiwayat();
  if (page === 'settings') renderSettings();
  if (page === 'kategori') renderKategori();
  if (page === 'tabungan') renderTabungan();
  if (page === 'input') {
    const pfx = document.getElementById('input-currency-prefix');
    if (pfx) pfx.textContent = getCurrencySymbol();
  }
}

// ===== BOTTOM NAV =====
function initBottomNav() {
  document.getElementById('nav-dashboard')?.addEventListener('click', () => navigateTo('dashboard'));
  document.getElementById('nav-settings')?.addEventListener('click', () => navigateTo('settings'));
  document.getElementById('nav-tabungan')?.addEventListener('click', () => navigateTo('tabungan'));
  document.getElementById('nav-fab')?.addEventListener('click', () => openInputPage('add'));
}

// ===== PRIVACY MODAL =====
function showPrivacyModal() {
  const overlay = document.getElementById('modal-overlay');
  const msgEl = document.getElementById('modal-message');
  const btnC = document.getElementById('modal-confirm');
  const btnCancel = document.getElementById('modal-cancel');

  msgEl.innerHTML = `
    <div style="text-align:left;">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;color:var(--gray-900);">🔒 Kenapa data kamu aman?</h3>
      <p style="font-size:14px;color:var(--gray-700);margin-bottom:10px;">
        <strong>Data 100% tersimpan di perangkat kamu.</strong> CatatDuit tidak punya server. Tidak ada yang bisa mengakses data kamu — bahkan pembuat aplikasinya sekalipun.
      </p>
      <p style="font-size:14px;color:var(--gray-700);margin-bottom:10px;">
        Semua catatan tersimpan di <em>localStorage</em> browser perangkat kamu. Artinya data tidak pernah keluar dari HP atau laptop kamu.
      </p>
      <p style="font-size:14px;color:var(--gray-700);margin-bottom:10px;">
        Tidak ada login, tidak ada akun, tidak ada iklan, tidak ada pelacak aktivitas.
      </p>
      <p style="font-size:13px;color:var(--gray-500);">
        ⚠️ Karena data ada di browser, hapus cache = data hilang. Selalu backup lewat Export Data secara berkala.
      </p>
    </div>`;

  btnC.textContent = 'Mengerti';
  btnC.style.background = 'var(--teal)';
  overlay.classList.add('show');
  const close = () => overlay.classList.remove('show');
  btnC.onclick = close;
  btnCancel.style.display = 'none';
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  // Restore cancel button visibility on close
  const origClose = close;
  const wrappedClose = () => { origClose(); btnCancel.style.display = ''; };
  btnC.onclick = wrappedClose;
  overlay.onclick = (e) => { if (e.target === overlay) wrappedClose(); };
}

// ===== Item 8: buildEmptyState — standardized empty state =====
// SVG ringan + teks + opsional CTA button
// icon: emoji string, title: string, desc: string (boleh HTML), cta: {label, onClick} atau null
function buildEmptyState(icon, title, desc, cta) {
  const ctaBtn = cta
    ? `<button class="btn-primary empty-cta" id="empty-cta-btn">${cta.label}</button>`
    : '';
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      ${title ? `<p class="empty-title">${title}</p>` : ''}
      <p class="empty-desc">${desc}</p>
      ${ctaBtn}
    </div>`;
}

// ===== Item 9: Goodwill Donation Nudge =====
const NUDGE_KEY    = STORAGE_KEYS.NUDGE;
const NUDGE_AFTER  = 20; // tampil setelah 20 transaksi

function checkAndShowDonationNudge() {
  try {
    if (getData(NUDGE_KEY, false)) return; // sudah pernah tampil
    const txCount = getTransaksi().length;
    if (txCount < NUDGE_AFTER) return;

    setData(NUDGE_KEY, true);

    const overlay  = document.getElementById('modal-overlay');
    const msgEl    = document.getElementById('modal-msg');
    const btnC     = document.getElementById('modal-confirm');
    const btnCancel = document.getElementById('modal-cancel');
    if (!overlay || !msgEl || !btnC) return;

    msgEl.innerHTML = `
      <div style="text-align:center;padding:8px 0 4px;">
        <div style="font-size:40px;margin-bottom:12px;">☕</div>
        <h3 style="font-size:17px;font-weight:700;margin-bottom:10px;color:var(--gray-900);">
          Udah ${txCount} catatan nih!
        </h3>
        <p style="font-size:14px;color:var(--gray-600);margin-bottom:6px;">
          CatatDuit gratis selamanya — tanpa iklan, tanpa langganan.
        </p>
        <p style="font-size:14px;color:var(--gray-600);">
          Kalau aplikasi ini membantu, boleh banget dukung pengembangan dengan beli kopi virtual. Enggak wajib sama sekali 😊
        </p>
      </div>`;

    btnC.textContent = '☕ Support Pengembang';
    btnC.style.background = 'var(--teal)';
    btnCancel.style.display = '';
    btnCancel.textContent = 'Nanti aja';
    overlay.classList.add('show');

    const close = () => {
      overlay.classList.remove('show');
      btnCancel.style.display = '';
      btnC.style.background = '';
    };
    btnC.onclick = () => {
      window.open('https://saweria.co/catatduit', '_blank');
      close();
    };
    btnCancel.onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
  } catch(e) {}
}

// ===== Item 10: Onboarding Checklist =====
const CHECKLIST_KEY = STORAGE_KEYS.CHECKLIST_DISMISSED;

function getOnboardingProgress() {
  const hasBudget  = Object.keys(getBudgets()).length > 0;
  const hasTagihan = getTagihan().length > 0;
  const hasGoal    = getGoals().length > 0;
  const hasMultiWallet = getWallets().length > 1;
  const hasTx     = getTransaksi().length > 0;

  const steps = [
    { id: 'tx',      label: 'Catat transaksi pertama',  done: hasTx,          nav: 'input' },
    { id: 'budget',  label: 'Set budget bulanan',        done: hasBudget,      nav: 'tabungan' },
    { id: 'tagihan', label: 'Tambah reminder tagihan',   done: hasTagihan,     nav: 'tabungan' },
    { id: 'goal',    label: 'Buat target menabung',      done: hasGoal,        nav: 'tabungan' },
    { id: 'wallet',  label: 'Tambah dompet kedua',       done: hasMultiWallet, nav: 'settings' },
  ];

  return { steps, doneCount: steps.filter(s => s.done).length };
}

function renderOnboardingChecklist(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Kalau sudah di-dismiss, skip
  if (getData(CHECKLIST_KEY, false)) { container.innerHTML = ''; return; }

  const { steps, doneCount } = getOnboardingProgress();

  // Kalau semua selesai, dismiss otomatis
  if (doneCount === steps.length) {
    setData(CHECKLIST_KEY, true);
    container.innerHTML = '';
    return;
  }

  const pct = Math.round((doneCount / steps.length) * 100);

  container.innerHTML = `
    <div class="checklist-card card" id="onboarding-checklist">
      <div class="checklist-header">
        <div>
          <p class="checklist-title">Setup CatatDuit kamu</p>
          <p class="checklist-sub">${doneCount} dari ${steps.length} selesai</p>
        </div>
        <button class="checklist-dismiss" id="btn-checklist-dismiss" title="Tutup">✕</button>
      </div>
      <div class="checklist-bar-wrap">
        <div class="checklist-bar" style="width:${pct}%"></div>
      </div>
      <div class="checklist-steps">
        ${steps.map(s => `
          <div class="checklist-step ${s.done ? 'done' : ''}" data-nav="${s.nav}">
            <span class="checklist-check">${s.done ? '✓' : ''}</span>
            <span class="checklist-label">${s.label}</span>
            ${!s.done ? '<span class="checklist-arrow">›</span>' : ''}
          </div>`).join('')}
      </div>
    </div>`;

  document.getElementById('btn-checklist-dismiss')?.addEventListener('click', () => {
    setData(CHECKLIST_KEY, true);
    container.innerHTML = '';
  });

  container.querySelectorAll('.checklist-step:not(.done)').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.nav));
  });
}
