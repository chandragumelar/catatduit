// ===== SETTINGS.JS — Settings page =====

function renderSettings() {
  const container = document.getElementById('settings-content');
  if (!container) return;

  const nama = getNama();
  const saldoAwal = getSaldoAwal();
  const txList = getTransaksi();

  container.innerHTML = `
    <div class="settings-section">
      <p class="settings-section-label">Profil</p>
      <div class="card" style="margin-bottom:0;padding:0;overflow:hidden;">
        <div class="settings-input-wrap">
          <span style="font-size:20px;">👤</span>
          <input type="text" class="settings-input" id="settings-nama" value="${escHtml(nama)}" placeholder="Nama kamu" maxlength="30" />
          <button class="btn-save-inline" id="btn-save-nama">Simpan</button>
        </div>
        <div class="settings-divider"></div>
        <div class="settings-input-wrap" id="saldo-awal-wrap">
          <span style="font-size:20px;">💵</span>
          <div style="flex:1;">
            <div style="font-size:14px;color:var(--gray-700);font-weight:500;">Saldo Awal</div>
            <div style="font-size:13px;color:var(--gray-500);" id="saldo-awal-display">${saldoAwal ? formatRupiah(saldoAwal) : 'Belum diisi'}</div>
          </div>
          <button class="btn-save-inline" id="btn-edit-saldo">Edit</button>
        </div>
        <div id="saldo-awal-edit-wrap" style="display:none;padding:12px 16px;border-top:1px solid var(--gray-100);">
          <label class="input-label" style="margin-bottom:6px;">Total uang sekarang (rekening + dompet + e-wallet)</label>
          <div class="nominal-wrap" style="margin-bottom:8px;">
            <span class="nominal-prefix">Rp</span>
            <input type="text" id="settings-saldo-input" class="input-nominal" placeholder="0" inputmode="numeric" value="${saldoAwal ? saldoAwal.toLocaleString('id-ID') : ''}" />
          </div>
          <button class="btn-primary" id="btn-save-saldo" style="width:auto;padding:8px 20px;font-size:14px;">Simpan</button>
        </div>
      </div>
      <p class="input-error" id="error-settings-nama"></p>
    </div>

    <div class="settings-section">
      <p class="settings-section-label">Kategori</p>
      <div style="background:var(--white);border-radius:var(--radius-md);box-shadow:var(--shadow-sm);">
        <div class="settings-item" id="btn-go-kategori">
          <div class="settings-item-left"><div class="settings-item-icon">🏷️</div><span class="settings-item-label">Kelola Kategori</span></div>
          <div class="settings-item-arrow"><i data-lucide="chevron-right"></i></div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <p class="settings-section-label">Data</p>
      <div style="background:var(--white);border-radius:var(--radius-md);box-shadow:var(--shadow-sm);">
        <div class="settings-item" id="btn-export" style="${txList.length === 0 ? 'opacity:0.5;cursor:not-allowed;' : ''}">
          <div class="settings-item-left"><div class="settings-item-icon">📤</div><span class="settings-item-label">Export Data (CSV)</span></div>
        </div>
        <div class="settings-item" id="btn-import">
          <div class="settings-item-left"><div class="settings-item-icon">📥</div><span class="settings-item-label">Import Data (CSV)</span></div>
        </div>
      </div>
      <input type="file" id="import-file-input" accept=".csv" style="display:none;" />
    </div>

    <div class="settings-section">
      <p class="settings-section-label">Tentang & Privasi</p>
      <div style="background:var(--white);border-radius:var(--radius-md);box-shadow:var(--shadow-sm);">
        <div class="settings-item" id="btn-privacy-info">
          <div class="settings-item-left"><div class="settings-item-icon">🔒</div><span class="settings-item-label">Kenapa data kamu aman?</span></div>
          <div class="settings-item-arrow"><i data-lucide="chevron-right"></i></div>
        </div>
        <div class="settings-item" style="cursor:default;">
          <div class="settings-item-left"><div class="settings-item-icon">💰</div><span class="settings-item-label">CatatDuit</span></div>
          <span class="settings-item-value">v2.0.0</span>
        </div>
        <div class="settings-item" style="cursor:default;">
          <div class="settings-item-left"><div class="settings-item-icon">📱</div>
          <span class="settings-item-label" style="font-size:13px;color:var(--gray-500);">Data di HP dan laptop terpisah. Gunakan Export/Import untuk pindah data.</span></div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <p class="settings-section-label">Zona Bahaya</p>
      <div style="background:var(--white);border-radius:var(--radius-md);box-shadow:var(--shadow-sm);">
        <div class="settings-item danger" id="btn-reset">
          <div class="settings-item-left"><div class="settings-item-icon">🗑️</div><span class="settings-item-label">Hapus Semua Data</span></div>
        </div>
      </div>
    </div>`;

  // Event listeners
  document.getElementById('btn-save-nama')?.addEventListener('click', () => {
    const val = document.getElementById('settings-nama').value.trim();
    const errEl = document.getElementById('error-settings-nama');
    if (!val) { errEl.textContent = 'Nama tidak boleh kosong.'; return; }
    setData(STORAGE_KEYS.NAMA, val);
    errEl.textContent = '';
    showToast('Nama berhasil disimpan ✓');
  });

  document.getElementById('btn-edit-saldo')?.addEventListener('click', () => {
    const editWrap = document.getElementById('saldo-awal-edit-wrap');
    editWrap.style.display = editWrap.style.display === 'none' ? 'block' : 'none';
    if (editWrap.style.display === 'block') {
      document.getElementById('settings-saldo-input')?.focus();
    }
  });

  const saldoInputEl = document.getElementById('settings-saldo-input');
  saldoInputEl?.addEventListener('input', () => {
    const raw = saldoInputEl.value.replace(/\D/g, '');
    saldoInputEl.value = raw ? Math.min(parseInt(raw, 10), MAX_NOMINAL).toLocaleString('id-ID') : '';
  });

  document.getElementById('btn-save-saldo')?.addEventListener('click', () => {
    const val = parseNominal(document.getElementById('settings-saldo-input').value);
    saveSaldoAwal(val);
    document.getElementById('saldo-awal-display').textContent = val ? formatRupiah(val) : 'Belum diisi';
    document.getElementById('saldo-awal-edit-wrap').style.display = 'none';
    showToast('Saldo awal disimpan ✓');
  });

  document.getElementById('btn-go-kategori')?.addEventListener('click', () => navigateTo('kategori'));
  document.getElementById('btn-privacy-info')?.addEventListener('click', () => showPrivacyModal());
  document.getElementById('btn-export')?.addEventListener('click', () => { if (txList.length > 0) exportCSV(); });
  document.getElementById('btn-import')?.addEventListener('click', () => document.getElementById('import-file-input')?.click());
  document.getElementById('import-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImport(file);
    e.target.value = '';
  });

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

  if (window.lucide) lucide.createIcons();
}
