// =============================================================================
// DEBUG.JS
// Tanggung jawab: DEV-only debug panel overlay — zero cost di production
// Depends on: state.js, storage.js
// =============================================================================
//
// Cara aktifkan:
//   localStorage.setItem('cd_debug', '1'); location.reload();
// Cara nonaktifkan:
//   localStorage.removeItem('cd_debug'); location.reload();
//
// Panel ini adalah no-op total jika cd_debug tidak di-set.
// =============================================================================

(function () {
  if (localStorage.getItem('cd_debug') !== '1') return;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #cd-debug-panel {
      position: fixed;
      bottom: 80px;
      right: 12px;
      z-index: 9999;
      background: rgba(15, 23, 42, 0.93);
      color: #e2e8f0;
      font-family: 'Menlo', 'Consolas', monospace;
      font-size: 11px;
      line-height: 1.6;
      border-radius: 10px;
      padding: 12px 14px;
      min-width: 220px;
      max-width: 280px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
      user-select: none;
    }
    #cd-debug-panel .cd-debug-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #94a3b8;
      text-transform: uppercase;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #cd-debug-panel .cd-debug-badge {
      background: #ef4444;
      color: white;
      border-radius: 4px;
      padding: 1px 5px;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    #cd-debug-panel .cd-debug-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 2px;
    }
    #cd-debug-panel .cd-debug-key { color: #94a3b8; }
    #cd-debug-panel .cd-debug-val { color: #7dd3fc; font-weight: 600; }
    #cd-debug-panel .cd-debug-divider {
      border: none;
      border-top: 1px solid rgba(255,255,255,0.08);
      margin: 8px 0;
    }
    #cd-debug-panel .cd-debug-actions {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-top: 8px;
    }
    #cd-debug-panel button {
      background: rgba(255,255,255,0.07);
      color: #e2e8f0;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 5px;
      padding: 4px 8px;
      font-size: 10px;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
    }
    #cd-debug-panel button:hover { background: rgba(255,255,255,0.14); }
    #cd-debug-panel .cd-debug-danger {
      color: #fca5a5;
      border-color: rgba(239,68,68,0.3);
    }
    #cd-debug-panel .cd-debug-danger:hover { background: rgba(239,68,68,0.15); }
  `;
  document.head.appendChild(style);

  // ── Panel HTML ───────────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'cd-debug-panel';
  document.body.appendChild(panel);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function _getStorageUsageKB() {
    let total = 0;
    for (const key of Object.keys(localStorage)) {
      total += (localStorage.getItem(key) || '').length;
    }
    return (total / 1024).toFixed(1);
  }

  function _getActiveWalletName() {
    try {
      const wallets = typeof getWallets === 'function' ? getWallets() : [];
      const id = state && state.selectedWalletId;
      if (id === 'semua') return 'Semua';
      const w = wallets.find(x => x.id === id);
      return w ? w.nama : id || '—';
    } catch (e) {
      return '?';
    }
  }

  function _getTxCount() {
    try {
      return typeof getTransaksi === 'function' ? getTransaksi().length : '?';
    } catch (e) {
      return '?';
    }
  }

  function _getSchemaVersion() {
    try {
      return localStorage.getItem('cd_schema_v') || '?';
    } catch (e) {
      return '?';
    }
  }

  function _row(key, val) {
    return `<div class="cd-debug-row"><span class="cd-debug-key">${key}</span><span class="cd-debug-val">${val}</span></div>`;
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  function _render() {
    const page = (state && state.currentPage) || '?';
    const txCount = _getTxCount();
    const storageKB = _getStorageUsageKB();
    const wallet = _getActiveWalletName();
    const schema = _getSchemaVersion();

    panel.innerHTML = `
      <div class="cd-debug-title">
        CatatDuit Debug
        <span class="cd-debug-badge">DEV</span>
      </div>
      ${_row('page', page)}
      ${_row('tx count', txCount)}
      ${_row('storage', storageKB + ' KB')}
      ${_row('wallet', wallet)}
      ${_row('schema v', schema)}
      <hr class="cd-debug-divider" />
      <div class="cd-debug-actions">
        <button id="cd-debug-copy">📋 Copy State JSON</button>
        <button id="cd-debug-reload">🔄 Reload</button>
        <button id="cd-debug-clear" class="cd-debug-danger">🗑 Clear All Data (DEV)</button>
      </div>
    `;

    document.getElementById('cd-debug-copy').onclick = function () {
      const payload = {
        state: typeof state !== 'undefined' ? state : null,
        schemaVersion: _getSchemaVersion(),
        txCount: _getTxCount(),
        storageKB: _getStorageUsageKB(),
      };
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
        .then(() => { if (typeof showToast === 'function') showToast('State JSON disalin', 'info'); })
        .catch(() => {});
    };

    document.getElementById('cd-debug-reload').onclick = function () {
      location.reload();
    };

    document.getElementById('cd-debug-clear').onclick = function () {
      if (!confirm('[DEV] Hapus SEMUA data CatatDuit dari localStorage?')) return;
      localStorage.clear();
      location.reload();
    };
  }

  // ── Auto-update ──────────────────────────────────────────────────────────────
  // Render setelah DOM siap, lalu refresh tiap 2 detik
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _render);
  } else {
    _render();
  }
  setInterval(_render, 2000);
})();
