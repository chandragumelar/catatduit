// ===== SETTINGS.JS — Settings page (v3) =====

function renderSettings() {
  const container = document.getElementById('settings-content');
  if (!container) return;

  const nama    = getNama();
  const txList  = getTransaksi();
  const wallets = getWallets();
  const usageKB = getStorageUsageKB();
  const usagePct = getStorageUsagePct();

  const backBanner = state.fromOnboarding
    ? `<div id="onboarding-back-banner" class="onboarding-back-banner">
        <span>←</span><span>Kembali ke Setup CatatDuit</span>
       </div>`
    : '';

  container.innerHTML = `
    ${backBanner}
    <!-- PROFIL -->
    <div class="settings-section">
      <p class="settings-section-label">Profil</p>
      <div class="card" style="margin-bottom:0;padding:0;overflow:hidden;">
        <div class="settings-input-wrap">
          <span style="font-size:20px;">👤</span>
          <input type="text" class="settings-input" id="settings-nama"
            value="${escHtml(nama)}" placeholder="Nama kamu" maxlength="30" />
          <button class="btn-save-inline" id="btn-save-nama">Simpan</button>
        </div>
      </div>
      <p class="input-error" id="error-settings-nama"></p>
    </div>

    <!-- WALLET -->
    <div class="settings-section">
      <p class="settings-section-label">Dompet</p>
      <div class="card" style="margin-bottom:0;padding:0;overflow:hidden;" id="settings-wallet-list">
        ${wallets.map((w, i) => `
          <div class="settings-item settings-wallet-item" data-idx="${i}">
            <div class="settings-item-left">
              <div class="settings-item-icon">${w.icon}</div>
              <div>
                <div class="settings-item-label">${escHtml(w.nama)}</div>
                <div class="settings-item-sub">Saldo awal: ${formatRupiah(w.saldo_awal || 0)}</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;align-items:center;flex-shrink:0;">
              <button class="btn-icon-sm" data-action="edit-wallet" data-idx="${i}"><i data-lucide="pencil"></i></button>
              ${wallets.length > 1 ? `<button class="btn-icon-sm danger" data-action="hapus-wallet" data-idx="${i}"><i data-lucide="trash-2"></i></button>` : ''}
            </div>
          </div>
          ${i < wallets.length - 1 ? '<div class="settings-divider"></div>' : ''}`).join('')}
        <div class="settings-divider"></div>
        <div class="settings-item" id="btn-add-wallet">
          <div class="settings-item-left">
            <div class="settings-item-icon">➕</div>
            <span class="settings-item-label">Tambah Dompet</span>
          </div>
        </div>
      </div>
    </div>

    <!-- KATEGORI -->
    <div class="settings-section">
      <p class="settings-section-label">Kategori</p>
      <div style="background:var(--white);border-radius:var(--radius-md);box-shadow:var(--shadow-sm);">
        <div class="settings-item" id="btn-go-kategori">
          <div class="settings-item-left">
            <div class="settings-item-icon">🏷️</div>
            <span class="settings-item-label">Kelola Kategori</span>
          </div>
          <div class="settings-item-arrow"><i data-lucide="chevron-right"></i></div>
        </div>
      </div>
    </div>

    <!-- TAMPILAN -->
    <div class="settings-section">
      <p class="settings-section-label">Tampilan</p>
      <div style="background:var(--white);border-radius:var(--radius-md);box-shadow:var(--shadow-sm);">
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon">💱</div>
            <div>
              <div class="settings-item-label">Mata Uang</div>
              <div class="settings-item-sub" style="font-size:10px;">Simbol saja, angka tidak dikonversi</div>
            </div>
          </div>
          <select id="currency-select" style="border:none;background:transparent;font-size:13px;color:var(--text-secondary);cursor:pointer;outline:none;padding:4px;">
            ${CURRENCY_OPTIONS.map(c => `<option value="${c.code}" ${(getData(STORAGE_KEYS.CURRENCY,'IDR')===c.code)?'selected':''}>${c.label}</option>`).join('')}
          </select>
        </div>
        <div class="settings-divider"></div>
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon">📊</div>
            <div>
              <div class="settings-item-label">Period Budget</div>
              <div class="settings-item-sub" style="font-size:10px;">Bulanan atau mingguan (Senin–Minggu)</div>
            </div>
          </div>
          <select id="budget-period-select" style="border:none;background:transparent;font-size:13px;color:var(--text-secondary);cursor:pointer;outline:none;padding:4px;">
            <option value="monthly" ${getBudgetPeriod()==='monthly'?'selected':''}>Bulanan</option>
            <option value="weekly"  ${getBudgetPeriod()==='weekly' ?'selected':''}>Mingguan</option>
          </select>
        </div>
      </div>
    </div>

    <!-- DATA -->
    <div class="settings-section">
      <p class="settings-section-label">Data</p>
      <div style="background:var(--white);border-radius:var(--radius-md);box-shadow:var(--shadow-sm);">
        <div class="settings-item" id="btn-export" style="${txList.length === 0 ? 'opacity:0.5;cursor:not-allowed;' : ''}">
          <div class="settings-item-left">
            <div class="settings-item-icon">📤</div>
            <span class="settings-item-label">Export Data (CSV)</span>
          </div>
        </div>
        <div class="settings-item" id="btn-import">
          <div class="settings-item-left">
            <div class="settings-item-icon">📥</div>
            <span class="settings-item-label">Import Data (CSV)</span>
          </div>
        </div>
      </div>
      <input type="file" id="import-file-input" accept=".csv" style="display:none;" />
    </div>

    <!-- STORAGE INDICATOR -->
    <div class="settings-section">
      <p class="settings-section-label">Penyimpanan</p>
      <div class="card" style="margin-bottom:0;">
        <div class="storage-indicator-header">
          <span class="storage-indicator-label">Digunakan: ${usageKB} KB</span>
          <span class="storage-indicator-label">${usagePct}% dari ~5 MB</span>
        </div>
        <div class="storage-bar-wrap">
          <div class="storage-bar ${usagePct > 80 ? 'storage-bar--warn' : ''}"
            style="width:${usagePct}%"></div>
        </div>
        <p class="storage-indicator-hint">
          ${txList.length} catatan tersimpan.
          ${usagePct > 70 ? '⚠️ Mulai penuh — pertimbangkan export data.' : 'Semua data ada di perangkat ini.'}
        </p>
      </div>
    </div>

    <!-- PRIVASI & TENTANG -->
    <div class="settings-section">
      <p class="settings-section-label">Tentang & Privasi</p>
      <div style="background:var(--white);border-radius:var(--radius-md);box-shadow:var(--shadow-sm);">
        <div class="settings-item" id="btn-privacy-info">
          <div class="settings-item-left">
            <div class="settings-item-icon">🔒</div>
            <span class="settings-item-label">Kenapa data kamu aman?</span>
          </div>
          <div class="settings-item-arrow"><i data-lucide="chevron-right"></i></div>
        </div>
        <div class="settings-item" style="cursor:default;">
          <div class="settings-item-left">
            <div class="settings-item-icon">💰</div>
            <span class="settings-item-label">CatatDuit</span>
          </div>
          <span class="settings-item-value">v3.0.0</span>
        </div>
        <div class="settings-item" style="cursor:default;">
          <div class="settings-item-left">
            <div class="settings-item-icon">📱</div>
            <span class="settings-item-label" style="font-size:13px;color:var(--gray-500);">
              Data di HP dan laptop terpisah. Gunakan Export/Import untuk pindah data.
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- NOTIFIKASI -->
    <div class="settings-section">
      <p class="settings-section-label">Notifikasi</p>
      <div style="background:var(--white);border-radius:var(--radius-md);box-shadow:var(--shadow-sm);">
        <div class="settings-item" id="btn-notif-toggle">
          <div class="settings-item-left">
            <div class="settings-item-icon">🔔</div>
            <div>
              <div class="settings-item-label">Reminder Tagihan</div>
              <div class="settings-item-sub" id="notif-status-text">Cek status...</div>
            </div>
          </div>
          <div class="settings-item-arrow" id="notif-toggle-arrow"><i data-lucide="chevron-right"></i></div>
        </div>
      </div>
    </div>

    <!-- ZONA BAHAYA -->
    <div class="settings-section">
      <p class="settings-section-label">Zona Bahaya</p>
      <div style="background:var(--white);border-radius:var(--radius-md);box-shadow:var(--shadow-sm);">
        <div class="settings-item danger" id="btn-reset">
          <div class="settings-item-left">
            <div class="settings-item-icon"><i data-lucide="trash-2"></i></div>
            <span class="settings-item-label">Hapus Semua Data</span>
          </div>
        </div>
      </div>
    </div>`;

  _initSettingsEvents(txList, wallets);
  // Notifikasi
  const notifStatus = getNotifPermissionStatus();
  const notifTextEl = document.getElementById('notif-status-text');
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isIOSStandalone = isIOS && window.navigator.standalone === true;
  const isIOSSafariNonPWA = isIOS && !window.navigator.standalone;

  if (notifTextEl) {
    if (notifStatus === 'unsupported') {
      if (isIOSSafariNonPWA) {
        notifTextEl.textContent = 'iOS: install ke home screen dulu untuk aktifkan notifikasi';
      } else {
        notifTextEl.textContent = 'Tidak didukung browser ini';
      }
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
    renderSettings(); // re-render untuk update status
  });

  if (window.lucide) lucide.createIcons();
}

function _initSettingsEvents(txList, wallets) {
  // Onboarding back banner
  document.getElementById('onboarding-back-banner')?.addEventListener('click', () => {
    state.fromOnboarding = false;
    navigateTo('dashboard');
  });

  // Nama
  document.getElementById('btn-save-nama')?.addEventListener('click', () => {
    const val   = document.getElementById('settings-nama').value.trim();
    const errEl = document.getElementById('error-settings-nama');
    if (!val) { errEl.textContent = 'Nama tidak boleh kosong.'; return; }
    setData(STORAGE_KEYS.NAMA, val);
    errEl.textContent = '';
    showToast('Nama berhasil disimpan ✓');
  });

  // Wallet: edit
  document.querySelectorAll('[data-action="edit-wallet"]').forEach(btn => {
    btn.addEventListener('click', () => _showWalletSheet(parseInt(btn.dataset.idx)));
  });

  // Wallet: hapus
  document.querySelectorAll('[data-action="hapus-wallet"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const w   = wallets[idx];
      if (!w) return;
      // cek apakah ada transaksi di wallet ini
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
    });
  });

  // Wallet: tambah
  document.getElementById('btn-add-wallet')?.addEventListener('click', () => _showWalletSheet(null));

  // Kategori
  document.getElementById('btn-go-kategori')?.addEventListener('click', () => navigateTo('kategori'));

  // Currency symbol — simpan lalu re-render semua yang perlu update
  // Budget period
  document.getElementById('budget-period-select')?.addEventListener('change', (e) => {
    saveBudgetPeriod(e.target.value);
    showToast(e.target.value === 'weekly' ? 'Budget diubah ke mingguan ✓' : 'Budget diubah ke bulanan ✓');
    renderDashboard();
  });

  document.getElementById('currency-select')?.addEventListener('change', (e) => {
    setData(STORAGE_KEYS.CURRENCY, e.target.value);

    // Selalu update input page prefix (ada di index.html, tidak di-render ulang)
    const pfx = document.getElementById('input-currency-prefix');
    if (pfx) pfx.textContent = getCurrencySymbol();

    // Re-render halaman yang sedang aktif
    const page = state.currentPage;
    if (page === 'dashboard')    renderDashboard();
    if (page === 'riwayat')      renderRiwayatContent();
    if (page === 'tabungan')     renderTabungan();
    // Settings selalu di-render ulang (wallet list punya saldo awal pakai formatRupiah)
    renderSettings();

    // Update semua nominal-prefix dan qc-prefix yang ada di DOM
    // (mencakup bottom sheet yang sedang terbuka)
    document.querySelectorAll('.nominal-prefix, .qc-prefix').forEach(el => {
      el.textContent = getCurrencySymbol();
    });

    showToast('Simbol mata uang diubah ✓');
  });

  // Export / Import
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

  // Privasi
  document.getElementById('btn-privacy-info')?.addEventListener('click', () => showPrivacyModal());

  // Reset
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

// ===== WALLET SHEET =====

function _showWalletSheet(idx) {
  const wallets = getWallets();
  const isEdit  = idx !== null;
  const w       = isEdit ? wallets[idx] : null;

  // Build preset grid untuk tambah baru
  const presetHTML = !isEdit ? `
    <div class="bottom-sheet-field">
      <label class="input-label">Pilih preset (opsional)</label>
      <div class="wallet-preset-grid" id="bs-wallet-preset-grid">
        ${WALLET_PRESETS.map(p => `
          <button type="button" class="wallet-preset-tile" data-preset-id="${p.id}"
            data-preset-nama="${escHtml(p.nama)}" data-preset-icon="${p.icon}">
            <span class="wallet-preset-icon">${p.icon}</span>
            <span class="wallet-preset-nama">${escHtml(p.nama)}</span>
          </button>`).join('')}
      </div>
    </div>` : '';

  _openBottomSheet({
    title: isEdit ? 'Edit Dompet' : 'Tambah Dompet',
    fields: `
      ${presetHTML}
      <div class="bottom-sheet-field">
        <label class="input-label">Nama dompet</label>
        <input type="text" id="bs-wallet-nama" class="input-field"
          placeholder="contoh: BCA, GoPay, Cash"
          value="${escHtml(w?.nama || '')}" maxlength="20" />
      </div>
      <div class="bottom-sheet-field">
        <label class="input-label">Saldo awal</label>
        <div class="nominal-wrap">
          <span class="nominal-prefix">${getCurrencySymbol()}</span>
          <input type="text" id="bs-wallet-saldo" class="input-nominal"
            placeholder="0"
            value="${w ? formatNominalInput(w.saldo_awal || 0) : ''}"
            inputmode="numeric" />
        </div>
        ${isEdit ? '<p class="bottom-sheet-hint">Saldo aktual dihitung otomatis dari transaksi. Saldo awal hanya titik mulai.</p>' : ''}
      </div>`,
    confirmText: isEdit ? 'Simpan' : 'Tambah Dompet',
    onOpen: () => {
      // format saldo input
      document.getElementById('bs-wallet-saldo').addEventListener('input', (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        e.target.value = raw ? formatNominalInput(Math.min(parseInt(raw, 10), MAX_NOMINAL)) : '';
      });

      // preset tiles
      document.querySelectorAll('#bs-wallet-preset-grid .wallet-preset-tile').forEach(tile => {
        tile.addEventListener('click', () => {
          document.querySelectorAll('#bs-wallet-preset-grid .wallet-preset-tile')
            .forEach(t => t.classList.remove('selected'));
          tile.classList.add('selected');
          document.getElementById('bs-wallet-nama').value = tile.dataset.presetNama;
        });
      });
    },
    onConfirm: () => {
      const nama   = document.getElementById('bs-wallet-nama').value.trim();
      const saldo  = parseNominal(document.getElementById('bs-wallet-saldo').value);
      if (!nama) return 'Nama dompet tidak boleh kosong.';

      // tentukan icon dari preset yang dipilih, atau default
      const selectedPreset = document.querySelector('#bs-wallet-preset-grid .wallet-preset-tile.selected');
      const icon = selectedPreset?.dataset.presetIcon || w?.icon || '💳';
      const id   = w?.id || (selectedPreset?.dataset.presetId) || generateId();

      if (isEdit) {
        wallets[idx] = { ...w, nama, icon, saldo_awal: saldo };
      } else {
        wallets.push({ id, nama, icon, saldo_awal: saldo });
      }

      saveWallets(wallets);
      showToast(isEdit ? 'Dompet diperbarui.' : 'Dompet ditambahkan!');
      renderSettings();
      return null;
    },
  });
}
