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
