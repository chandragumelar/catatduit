// =============================================================================
// SETTINGS.HTML.JS
// Tanggung jawab: HTML builder untuk tiap section settings (pure template functions)
// Depends on: storage.base.js, storage.transaksi.js, storage.wallet.js, storage.budget.js, utils.js
// =============================================================================


function _buildSettingsProfilHTML(nama) {
  return `
    <div class="settings-section">
      <p class="settings-section-label">Profil</p>
      <div class="card settings-card-flush">
        <div class="settings-input-wrap">
          <span class="settings-avatar-icon">👤</span>
          <input type="text" class="settings-input" id="settings-nama"
            value="${escHtml(nama)}" placeholder="Nama kamu" maxlength="30" />
          <button class="btn-save-inline" id="btn-save-nama">Simpan</button>
        </div>
      </div>
      <p class="input-error" id="error-settings-nama"></p>
    </div>`;
}

function _buildSettingsWalletHTML(wallets) {
  const isMulti = isMulticurrencyEnabled();
  const items = wallets.map((w, i) => {
    const wCurrency  = w.currency || getBaseCurrency();
    const currBadge  = isMulti
      ? `<span class="wallet-currency-badge">${wCurrency}</span>`
      : '';
    return `
    <div class="settings-item settings-wallet-item" data-idx="${i}">
      <div class="settings-item-left">
        <div class="settings-item-icon">${w.icon}</div>
        <div>
          <div class="settings-item-label">${escHtml(w.nama)} ${currBadge}</div>
          <div class="settings-item-sub">Saldo awal: ${formatWithCurrency(w.saldo_awal || 0, wCurrency)}</div>
        </div>
      </div>
      <div class="settings-wallet-actions">
        <button class="btn-icon-sm" data-action="edit-wallet" data-idx="${i}"><i data-lucide="pencil"></i></button>
        ${wallets.length > 1 ? `<button class="btn-icon-sm danger" data-action="hapus-wallet" data-idx="${i}"><i data-lucide="trash-2"></i></button>` : ''}
      </div>
    </div>
    ${i < wallets.length - 1 ? '<div class="settings-divider"></div>' : ''}`;
  }).join('');

  return `
    <div class="settings-section">
      <p class="settings-section-label">Dompet</p>
      <div class="settings-card-flush card" id="settings-wallet-list">
        ${items}
        <div class="settings-divider"></div>
        <div class="settings-item" id="btn-add-wallet">
          <div class="settings-item-left">
            <div class="settings-item-icon">➕</div>
            <span class="settings-item-label">Tambah Dompet</span>
          </div>
        </div>
      </div>
    </div>`;
}

function _buildSettingsTampilanHTML() {

  return `
    <div class="settings-section">
      <p class="settings-section-label">Kategori</p>
      <div class="settings-card">
        <div class="settings-item" id="btn-go-kategori">
          <div class="settings-item-left">
            <div class="settings-item-icon">🏷️</div>
            <span class="settings-item-label">Kelola Kategori</span>
          </div>
          <div class="settings-item-arrow"><i data-lucide="chevron-right"></i></div>
        </div>
      </div>
    </div>

    `;
}

function _buildSettingsDataHTML(txCount) {
  return `
    <div class="settings-section">
      <p class="settings-section-label">Data</p>
      <div class="settings-card">
        <div class="settings-item ${txCount === 0 ? 'settings-item--disabled' : ''}" id="btn-export">
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
      <input type="file" id="import-file-input" accept=".csv" class="hidden-input" />
    </div>`;
}

function _buildSettingsStorageHTML(usageKB, usagePct, txCount) {
  return `
    <div class="settings-section">
      <p class="settings-section-label">Penyimpanan</p>
      <div class="card settings-card-mb0">
        <div class="storage-indicator-header">
          <span class="storage-indicator-label">Digunakan: ${usageKB} KB</span>
          <span class="storage-indicator-label">${usagePct}% dari ~5 MB</span>
        </div>
        <div class="storage-bar-wrap">
          <div class="storage-bar ${usagePct > 80 ? 'storage-bar--warn' : ''}" id="storage-bar-fill" data-pct="${usagePct}"></div>
        </div>
        <p class="storage-indicator-hint">
          ${txCount} catatan tersimpan.
          ${usagePct > 70 ? '⚠️ Mulai penuh — pertimbangkan export data.' : 'Semua data ada di perangkat ini.'}
        </p>
      </div>
    </div>`;
}

function _buildSettingsAboutHTML() {
  return `
    <div class="settings-section">
      <p class="settings-section-label">Tentang &amp; Privasi</p>
      <div class="settings-card">
        <div class="settings-item" id="btn-privacy-info">
          <div class="settings-item-left">
            <div class="settings-item-icon">🔒</div>
            <span class="settings-item-label">Kenapa data kamu aman?</span>
          </div>
          <div class="settings-item-arrow"><i data-lucide="chevron-right"></i></div>
        </div>
        <div class="settings-item settings-item--no-cursor">
          <div class="settings-item-left">
            <div class="settings-item-icon">💰</div>
            <span class="settings-item-label">CatatDuit</span>
          </div>
          <span class="settings-item-value">v3.0.0</span>
        </div>
        <div class="settings-item settings-item--no-cursor">
          <div class="settings-item-left">
            <div class="settings-item-icon">📱</div>
            <span class="settings-item-label settings-item-label--hint">
              Data di HP dan laptop terpisah. Gunakan Export/Import untuk pindah data.
            </span>
          </div>
        </div>
        <div class="settings-item" id="btn-maker-github">
          <div class="settings-item-left">
            <div class="settings-item-icon">👨‍💻</div>
            <div>
              <span class="settings-item-label">Dibuat oleh Chandra Gumelar</span>
              <span class="settings-item-label--hint" style="display:block;font-size:11px;margin-top:1px;">Lihat source code di GitHub</span>
            </div>
          </div>
          <div class="settings-item-arrow"><i data-lucide="chevron-right"></i></div>
        </div>
        <div class="settings-item" id="btn-maker-x">
          <div class="settings-item-left">
            <div class="settings-item-icon">𝕏</div>
            <span class="settings-item-label">@win32_icang</span>
          </div>
          <div class="settings-item-arrow"><i data-lucide="chevron-right"></i></div>
        </div>
      </div>
    </div>`;
}

function _buildSettingsNotifHTML() {
  return `
    <div class="settings-section">
      <p class="settings-section-label">Notifikasi</p>
      <div class="settings-card">
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
    </div>`;
}

function _buildSettingsDangerHTML() {
  return `
    <div class="settings-section">
      <p class="settings-section-label">Zona Bahaya</p>
      <div class="settings-card">
        <div class="settings-item danger" id="btn-reset">
          <div class="settings-item-left">
            <div class="settings-item-icon"><i data-lucide="trash-2"></i></div>
            <span class="settings-item-label">Hapus Semua Data</span>
          </div>
        </div>
      </div>
    </div>`;
}
