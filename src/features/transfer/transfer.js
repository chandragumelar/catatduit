// =============================================================================
// TRANSFER.JS
// Tanggung jawab: Atomic transfer antar wallet (transfer_out + transfer_in pair)
// Depends on: state.js, storage.js, utils.js, ui.js, bottom-sheet.js
// =============================================================================

// Depends on: storage.js (saveTransferAtomic, getWallets),
//             bottom-sheet.js (_openBottomSheet),
//             ui.js (showToast), utils.js (formatRupiah, parseNominal)

// ===== PUBLIC API =====

function openTransferSheet() {
  const wallets = getWallets();

  if (wallets.length < 2) {
    showToast('⚠️ Kamu butuh minimal 2 dompet untuk transfer.');
    return;
  }

  _renderTransferSheet(wallets);
}

// ===== RENDER =====

function _renderTransferSheet(wallets) {
  const walletOptions = wallets
    .map(w => `<option value="${w.id}">${w.icon} ${escHtml(w.nama)}</option>`)
    .join('');

  // Default: from = wallet[0], to = wallet[1]
  const defaultFrom = wallets[0].id;
  const defaultTo   = wallets[1].id;

  _openBottomSheet({
    title: '↗ Transfer Antar Dompet',
    fields: `
      <div class="bottom-sheet-field">
        <label class="input-label">Dari dompet</label>
        <select id="tf-from" class="input-field">
          ${wallets.map(w =>
            `<option value="${w.id}" ${w.id === defaultFrom ? 'selected' : ''}>${w.icon} ${escHtml(w.nama)}</option>`
          ).join('')}
        </select>
        <div class="tf-saldo-hint" id="tf-from-saldo"></div>
      </div>

      <div class="bottom-sheet-field tf-swap-wrap">
        <button type="button" id="tf-swap-btn" class="tf-swap-btn" title="Balik arah">
          ⇅ Balik arah
        </button>
      </div>

      <div class="bottom-sheet-field">
        <label class="input-label">Ke dompet</label>
        <select id="tf-to" class="input-field">
          ${wallets.map(w =>
            `<option value="${w.id}" ${w.id === defaultTo ? 'selected' : ''}>${w.icon} ${escHtml(w.nama)}</option>`
          ).join('')}
        </select>
        <div class="tf-saldo-hint" id="tf-to-saldo"></div>
      </div>

      <div class="bottom-sheet-field">
        <label class="input-label">Nominal</label>
        <div class="nominal-wrap">
          <span class="nominal-prefix" id="tf-currency-prefix">${getCurrencySymbol()}</span>
          <input type="text" id="tf-nominal" class="input-nominal"
            placeholder="0" inputmode="numeric" autocomplete="off" />
        </div>
        <div class="tf-saldo-hint" id="tf-nominal-hint"></div>
      </div>

      <div class="bottom-sheet-field">
        <label class="input-label">Tanggal</label>
        <input type="date" id="tf-tanggal" class="input-field" value="${getTodayStr()}" />
      </div>

      <div class="bottom-sheet-field">
        <label class="input-label">Catatan (opsional)</label>
        <input type="text" id="tf-catatan" class="input-field"
          placeholder="misal: top-up GoPay" maxlength="100" />
      </div>
    `,
    confirmText: 'Transfer Sekarang',

    onOpen: () => {
      _initTransferSheetLogic(wallets);
    },

    onConfirm: () => {
      return _handleTransferConfirm(wallets);
    },
  });
}

function _initTransferSheetLogic(wallets) {
  const fromEl    = document.getElementById('tf-from');
  const toEl      = document.getElementById('tf-to');
  const nominalEl = document.getElementById('tf-nominal');
  const swapBtn   = document.getElementById('tf-swap-btn');

  // Update saldo hints on wallet change
  const _updateHints = () => {
    _updateSaldoHint('tf-from-saldo', fromEl.value, wallets);
    _updateSaldoHint('tf-to-saldo',   toEl.value,   wallets);
    _validateNominalHint(nominalEl.value, fromEl.value);
  };

  fromEl.addEventListener('change', () => {
    // Prevent same wallet on both sides
    if (fromEl.value === toEl.value) {
      const altWallet = wallets.find(w => w.id !== fromEl.value);
      if (altWallet) toEl.value = altWallet.id;
    }
    _updateHints();
  });

  toEl.addEventListener('change', () => {
    if (fromEl.value === toEl.value) {
      const altWallet = wallets.find(w => w.id !== toEl.value);
      if (altWallet) fromEl.value = altWallet.id;
    }
    _updateHints();
  });

  // Nominal formatting + hint
  nominalEl.addEventListener('input', () => {
    const raw = nominalEl.value.replace(/\D/g, '');
    nominalEl.value = raw ? formatNominalInput(Math.min(parseInt(raw, 10), MAX_NOMINAL)) : '';
    _validateNominalHint(nominalEl.value, fromEl.value);
  });

  // Swap button
  swapBtn.addEventListener('click', () => {
    const tmp = fromEl.value;
    fromEl.value = toEl.value;
    toEl.value   = tmp;
    _updateHints();
  });

  // Init hints
  _updateHints();
}

function _updateSaldoHint(elId, walletId, wallets) {
  const el = document.getElementById(elId);
  if (!el) return;
  const wallet = wallets.find(w => w.id === walletId);
  if (!wallet) { el.textContent = ''; return; }
  const saldo = getSaldoWallet(walletId);
  el.textContent = `Saldo: ${formatRupiah(saldo)}`;
  el.style.color = saldo < 0 ? 'var(--danger)' : 'var(--text-muted)';
}

function _validateNominalHint(nominalStr, fromWalletId) {
  const hint = document.getElementById('tf-nominal-hint');
  if (!hint) return;
  const nominal = parseNominal(nominalStr);
  if (!nominal) { hint.textContent = ''; return; }
  const saldo = getSaldoWallet(fromWalletId);
  if (nominal > saldo) {
    hint.textContent = `⚠️ Nominal melebihi saldo (${formatRupiah(saldo)})`;
    hint.style.color = 'var(--warning)';
  } else {
    hint.textContent = `Sisa setelah transfer: ${formatRupiah(saldo - nominal)}`;
    hint.style.color = 'var(--text-muted)';
  }
}

function _handleTransferConfirm(wallets) {
  const fromId  = document.getElementById('tf-from')?.value;
  const toId    = document.getElementById('tf-to')?.value;
  const nominal = parseNominal(document.getElementById('tf-nominal')?.value || '');
  const tanggal = document.getElementById('tf-tanggal')?.value || getTodayStr();
  const catatan = document.getElementById('tf-catatan')?.value?.trim() || '';

  // Validations
  if (!fromId || !toId)         return 'Pilih dompet asal dan tujuan.';
  if (fromId === toId)          return 'Dompet asal dan tujuan harus berbeda.';
  if (!nominal || nominal <= 0) return 'Masukkan nominal yang valid.';
  if (!tanggal)                 return 'Pilih tanggal transfer.';

  // Warning tapi tetap boleh lanjut jika nominal > saldo
  const saldo = getSaldoWallet(fromId);
  if (nominal > saldo) {
    // Soft warning — kita lanjutkan saja, bukan block.
    // User mungkin sengaja catat transfer dari rekening yang datanya belum lengkap.
  }

  const ok = saveTransferAtomic({ fromWalletId: fromId, toWalletId: toId, nominal, tanggal, catatan });

  if (ok) {
    const fromWallet = wallets.find(w => w.id === fromId);
    const toWallet   = wallets.find(w => w.id === toId);
    invalidateTransaksiCache();
    showToast(`✅ Transfer ${formatRupiah(nominal)} dari ${fromWallet?.nama} ke ${toWallet?.nama} dicatat.`, 3000);
    renderDashboard();
    return null; // null = tutup sheet
  }

  return 'Gagal menyimpan transfer. Coba lagi.';
}
