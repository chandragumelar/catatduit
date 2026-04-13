// =============================================================================
// SETTINGS.JS
// Tanggung jawab: Orchestrator — render settings page & init events
// Depends on: settings.html.js, settings.wallet.js, storage.*.js, utils.js, ui.js, shared/pwa.js
// =============================================================================


function renderSettings() {
  const container = document.getElementById('settings-content');
  if (!container) return;

  const nama     = getNama();
  const txList   = getTransaksi();
  const wallets  = getWallets();
  const usageKB  = getStorageUsageKB();
  const usagePct = getStorageUsagePct();

  const backBanner = state.fromOnboarding
    ? `<div id="onboarding-back-banner" class="onboarding-back-banner">
        <span>←</span><span>Kembali ke Setup CatatDuit</span>
       </div>`
    : '';

  container.innerHTML = [
    backBanner,
    _buildSettingsProfilHTML(nama),
    _buildSettingsWalletHTML(wallets),
    _buildSettingsTampilanHTML(),
    _buildSettingsDataHTML(txList.length),
    _buildSettingsStorageHTML(usageKB, usagePct, txList.length),
    _buildSettingsAboutHTML(),
    _buildSettingsNotifHTML(),
    _buildSettingsDangerHTML(),
  ].join('');

  _initSettingsEvents(txList, wallets);
  _initSettingsNotif();

  // Storage bar width — via JS to avoid CSP inline style block
  const barEl = document.getElementById('storage-bar-fill');
  if (barEl) barEl.style.width = usagePct + '%';

  if (window.lucide) lucide.createIcons();
}

// ===== EVENTS =====

function _initSettingsEvents(txList, wallets) {
  document.getElementById('onboarding-back-banner')?.addEventListener('click', () => {
    state.fromOnboarding = false;
    navigateTo('dashboard');
  });

  document.getElementById('btn-save-nama')?.addEventListener('click', () => {
    const val   = document.getElementById('settings-nama').value.trim();
    const errEl = document.getElementById('error-settings-nama');
    if (!val) { errEl.textContent = 'Nama tidak boleh kosong.'; return; }
    setData(STORAGE_KEYS.NAMA, val);
    errEl.textContent = '';
    showToast('Nama berhasil disimpan ✓');
  });

  document.querySelectorAll('[data-action="edit-wallet"]').forEach(btn => {
    btn.addEventListener('click', () => _showWalletSheet(parseInt(btn.dataset.idx)));
  });

  document.querySelectorAll('[data-action="hapus-wallet"]').forEach(btn => {
    btn.addEventListener('click', () => _onHapusWallet(parseInt(btn.dataset.idx), wallets));
  });

  document.getElementById('btn-add-wallet')?.addEventListener('click', () => _showWalletSheet(null));
  document.getElementById('btn-go-kategori')?.addEventListener('click', () => navigateTo('kategori'));

  document.getElementById('budget-period-select')?.addEventListener('change', (e) => {
    saveBudgetPeriod(e.target.value);
    showToast(e.target.value === 'weekly' ? 'Budget diubah ke mingguan ✓' : 'Budget diubah ke bulanan ✓');
    renderDashboard();
  });

  document.getElementById('currency-select')?.addEventListener('change', (e) => {
    _onCurrencyChange(e.target.value);
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    if (txList.length > 0) exportCSV();
  });
  document.getElementById('btn-import')?.addEventListener('click', () =>
    document.getElementById('import-file-input')?.click());
  document.getElementById('import-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImport(file);
    e.target.value = '';
  });

  document.getElementById('btn-privacy-info')?.addEventListener('click', () => showPrivacyModal());

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    showModal('Semua data akan dihapus permanen. Lanjutkan?', () => {
      showModal('Yakin? Tindakan ini tidak bisa dibatalkan.', () => {
        Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
        invalidateTransaksiCache();
        showToast('Semua data dihapus.');
        setTimeout(() => location.reload(), 800);
      }, 'Ya, Hapus Semua');
    }, 'Lanjutkan');
  });
}

function _onHapusWallet(idx, wallets) {
  const w = wallets[idx];
  if (!w) return;
  const txCount = getTransaksi().filter(tx => tx.wallet_id === w.id).length;
  const msg = txCount > 0
    ? `Hapus dompet "${w.nama}"? Ada ${txCount} catatan terkait — catatan tidak ikut terhapus, tapi wallet-nya hilang.`
    : `Hapus dompet "${w.nama}"?`;
  showModal(msg, () => {
    wallets.splice(idx, 1);
    saveWallets(wallets);
    showToast('Dompet dihapus.');
    renderSettings();
  }, 'Ya, Hapus');
}

function _onCurrencyChange(value) {
  setData(STORAGE_KEYS.CURRENCY, value);

  const pfx = document.getElementById('input-currency-prefix');
  if (pfx) pfx.textContent = getCurrencySymbol();

  const page = state.currentPage;
  if (page === 'dashboard') renderDashboard();
  if (page === 'riwayat')   renderRiwayatContent();
  if (page === 'tabungan')  renderTabungan();
  renderSettings();

  document.querySelectorAll('.nominal-prefix, .qc-prefix').forEach(el => {
    el.textContent = getCurrencySymbol();
  });

  showToast('Simbol mata uang diubah ✓');
}

// ===== NOTIFIKASI =====

function _initSettingsNotif() {
  const notifStatus       = getNotifPermissionStatus();
  const notifTextEl       = document.getElementById('notif-status-text');
  const isIOS             = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isIOSSafariNonPWA = isIOS && !window.navigator.standalone;

  if (notifTextEl) {
    if (notifStatus === 'unsupported') {
      notifTextEl.textContent = isIOSSafariNonPWA
        ? 'iOS: install ke home screen dulu untuk aktifkan notifikasi'
        : 'Tidak didukung browser ini';
    } else if (notifStatus === 'granted') {
      notifTextEl.textContent = 'Aktif — reminder tagihan jatuh tempo';
    } else if (notifStatus === 'denied') {
      notifTextEl.textContent = 'Diblokir — aktifkan di Pengaturan > Safari > Notifikasi';
    } else {
      notifTextEl.textContent = isIOS
        ? 'Ketuk untuk aktifkan (iOS 16.4+ via home screen)'
        : 'Ketuk untuk aktifkan';
    }
  }

  document.getElementById('btn-notif-toggle')?.addEventListener('click', async () => {
    if (notifStatus === 'denied') {
      showToast(isIOS
        ? 'Buka Pengaturan > Safari > Notifikasi untuk aktifkan.'
        : 'Aktifkan notifikasi di pengaturan browser dulu.'
      );
      return;
    }
    if (isIOSSafariNonPWA) {
      showToast('Di iPhone, install CatatDuit ke home screen dulu, lalu buka dari sana.');
      return;
    }
    await requestNotifPermission();
    renderSettings();
  });
}
