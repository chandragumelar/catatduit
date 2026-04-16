// =============================================================================
// TRANSFER.JS
// Tanggung jawab: Atomic transfer antar wallet (transfer_out + transfer_in pair)
// Depends on: state.js, storage.js, utils.js, ui.js, bottom-sheet.js
// =============================================================================

// ===== PUBLIC API =====

function openTransferSheet() {
  const wallets = getWallets().filter(w => !w.hidden);

  if (wallets.length < 2) {
    const onlyWallet = wallets[0];
    const onlyCur    = onlyWallet ? getWalletCurrency(onlyWallet) : null;
    const onlySym    = onlyCur ? getCurrencySymbolByCode(onlyCur) : '';
    const curLabel   = onlyCur ? `${onlyCur} (${onlySym})` : 'mata uang yang sama';
    _openBottomSheet({
      title: 'Pindah Dompet',
      fields: `
        <div style="text-align:center; padding: 8px 0 16px;">
          <div style="font-size: 2rem; margin-bottom: 12px;">&#128161;</div>
          <p style="margin: 0 0 8px; font-weight: 600; color: var(--text);">Tambah satu dompet lagi</p>
          <p style="margin: 0; color: var(--text-muted); font-size: 0.9rem;">Fitur transfer hanya bisa antar dompet dengan mata uang yang sama. Tambah dompet <strong>${curLabel}</strong> lain untuk mulai pakai fitur ini.</p>
        </div>
      `,
      confirmText: '+ Tambah Dompet',
      onConfirm: () => {
        navigateTo('settings');
        return null;
      },
    });
    return;
  }

  const hasSameCurrencyPair = wallets.some(w =>
    wallets.some(other => other.id !== w.id && getWalletCurrency(other) === getWalletCurrency(w))
  );

  if (!hasSameCurrencyPair) {
    const currencies = [...new Set(wallets.map(w => {
      const cur = getWalletCurrency(w);
      const sym = getCurrencySymbolByCode(cur);
      return `${cur} (${sym})`;
    }))].join(' dan ');
    _openBottomSheet({
      title: 'Pindah Dompet',
      fields: `
        <div style="text-align:center; padding: 8px 0 16px;">
          <div style="font-size: 2rem; margin-bottom: 12px;">&#128260;</div>
          <p style="margin: 0 0 8px; font-weight: 600; color: var(--text);">Dompetmu beda mata uang</p>
          <p style="margin: 0; color: var(--text-muted); font-size: 0.9rem;">Transfer hanya bisa antar dompet dengan mata uang yang sama. Kamu punya dompet ${currencies} — tambah dompet dengan mata uang yang sama untuk pakai fitur ini.</p>
        </div>
      `,
      confirmText: '+ Tambah Dompet',
      onConfirm: () => {
        navigateTo('settings');
        return null;
      },
    });
    return;
  }

  _renderTransferSheet(wallets);
}

// ===== RENDER =====

function _buildToOptions(wallets, fromId) {
  const fromCur = getWalletCurrency(wallets.find(w => w.id === fromId));
  const eligible = wallets.filter(w => w.id !== fromId && getWalletCurrency(w) === fromCur);
  if (!eligible.length) return `<option value="" disabled>Tidak ada dompet dengan mata uang yang sama</option>`;
  return eligible.map(w => {
    const sym = getCurrencySymbolByCode(getWalletCurrency(w));
    return `<option value="${w.id}">${w.icon} ${escHtml(w.nama)} (${sym})</option>`;
  }).join('');
}

function _renderTransferSheet(wallets) {
  const defaultFrom  = wallets[0].id;
  const fromWallet   = wallets[0];
  const fromCurrency = getWalletCurrency(fromWallet);
  const fromSym      = getCurrencySymbolByCode(fromCurrency);

  _openBottomSheet({
    title: '↗ Transfer Antar Dompet',
    fields: `
      <div class="bottom-sheet-field">
        <label class="input-label">Dari dompet</label>
        <select id="tf-from" class="input-field">
          ${wallets.map(w => {
            const sym = getCurrencySymbolByCode(getWalletCurrency(w));
            return `<option value="${w.id}" ${w.id === defaultFrom ? 'selected' : ''}>${w.icon} ${escHtml(w.nama)} (${sym})</option>`;
          }).join('')}
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
          ${_buildToOptions(wallets, defaultFrom)}
        </select>
        <div class="tf-saldo-hint" id="tf-to-saldo"></div>
      </div>

      <div class="bottom-sheet-field">
        <label class="input-label">Nominal</label>
        <div class="nominal-wrap">
          <span class="nominal-prefix" id="tf-currency-prefix">${fromSym}</span>
          <input type="text" id="tf-nominal" class="input-nominal"
            placeholder="0" inputmode="numeric" autocomplete="off" />
        </div>
        <div class="tf-saldo-hint" id="tf-nominal-hint"></div>
      </div>

      <div class="bottom-sheet-field">
        <label class="input-label">Tanggal</label>
        <div class="date-picker-wrap">
        <input type="date" id="tf-tanggal" class="input-field" value="${getTodayStr()}" />
        </div>
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
  const prefixEl  = document.getElementById('tf-currency-prefix');

  const _updateFromCurrencyPrefix = () => {
    const fromWallet = wallets.find(w => w.id === fromEl.value);
    if (prefixEl && fromWallet) {
      prefixEl.textContent = getCurrencySymbolByCode(getWalletCurrency(fromWallet));
    }
  };

  const _updateHints = () => {
    _updateSaldoHint('tf-from-saldo', fromEl.value, wallets);
    _updateSaldoHint('tf-to-saldo',   toEl.value,   wallets);
    _validateNominalHint(nominalEl.value, fromEl.value, wallets);
    _updateFromCurrencyPrefix();
  };

  const _rebuildToOptions = () => {
    const prevToId = toEl.value;
    toEl.innerHTML = _buildToOptions(wallets, fromEl.value);
    if (toEl.querySelector(`option[value="${prevToId}"]`)) toEl.value = prevToId;
    _updateHints();
  };

  fromEl.addEventListener('change', _rebuildToOptions);

  toEl.addEventListener('change', () => {
    _updateHints();
  });

  nominalEl.addEventListener('input', () => {
    const raw = nominalEl.value.replace(/\D/g, '');
    nominalEl.value = raw ? formatNominalInput(Math.min(parseInt(raw, 10), MAX_NOMINAL)) : '';
    _validateNominalHint(nominalEl.value, fromEl.value, wallets);
  });

  swapBtn.addEventListener('click', () => {
    const prevFrom = fromEl.value;
    const prevTo   = toEl.value;
    if (!prevTo) return; // no eligible target, nothing to swap
    fromEl.value = prevTo;
    toEl.innerHTML = _buildToOptions(wallets, fromEl.value);
    if (toEl.querySelector(`option[value="${prevFrom}"]`)) toEl.value = prevFrom;
    _updateHints();
  });

  _updateHints();
}

function _updateSaldoHint(elId, walletId, wallets) {
  const el = document.getElementById(elId);
  if (!el) return;
  const wallet = wallets.find(w => w.id === walletId);
  if (!wallet) { el.textContent = ''; return; }
  const saldo  = getSaldoWallet(walletId);
  const wCur   = getWalletCurrency(wallet);
  el.textContent = `Saldo: ${formatWithCurrency(saldo, wCur)}`;
  el.style.color = saldo < 0 ? 'var(--danger)' : 'var(--text-muted)';
}

function _validateNominalHint(nominalStr, fromWalletId, wallets) {
  const hint = document.getElementById('tf-nominal-hint');
  if (!hint) return;
  const nominal = parseNominal(nominalStr);
  if (!nominal) { hint.textContent = ''; return; }
  const saldo  = getSaldoWallet(fromWalletId);
  const fromW  = wallets ? wallets.find(w => w.id === fromWalletId) : null;
  const wCur   = fromW ? getWalletCurrency(fromW) : null;
  const fmt    = (v) => wCur ? formatWithCurrency(v, wCur) : formatRupiah(v);
  if (nominal > saldo) {
    hint.textContent = `⚠️ Nominal melebihi saldo (${fmt(saldo)})`;
    hint.style.color = 'var(--warning)';
  } else {
    hint.textContent = `Sisa setelah transfer: ${fmt(saldo - nominal)}`;
    hint.style.color = 'var(--text-muted)';
  }
}

function _handleTransferConfirm(wallets) {
  const fromId  = document.getElementById('tf-from')?.value;
  const toId    = document.getElementById('tf-to')?.value;
  const nominal = parseNominal(document.getElementById('tf-nominal')?.value || '');
  const tanggal = document.getElementById('tf-tanggal')?.value || getTodayStr();
  const catatan = document.getElementById('tf-catatan')?.value?.trim() || '';

  if (!fromId || !toId)         return 'Pilih dompet asal dan tujuan.';
  if (fromId === toId)          return 'Dompet asal dan tujuan harus berbeda.';
  if (!nominal || nominal <= 0) return 'Masukkan nominal yang valid.';
  if (!tanggal)                 return 'Pilih tanggal transfer.';

  const fromWallet = wallets.find(w => w.id === fromId);
  const toWallet   = wallets.find(w => w.id === toId);
  const fromCur    = getWalletCurrency(fromWallet);
  const toCur      = getWalletCurrency(toWallet);

  if (fromCur !== toCur) return `Transfer hanya bisa antar dompet dengan mata uang yang sama (${fromCur} ≠ ${toCur}).`;

  const ok = saveTransferAtomic({ fromWalletId: fromId, toWalletId: toId, nominal, tanggal, catatan });

  if (ok) {
    invalidateTransaksiCache();
    const fromSym = getCurrencySymbolByCode(fromCur);
    showToast(`✅ Transfer ${fromSym} ${nominal.toLocaleString('id-ID')} dari ${fromWallet?.nama} ke ${toWallet?.nama} dicatat.`, 3000);
    renderDashboard();
    return null;
  }

  return 'Gagal menyimpan transfer. Coba lagi.';
}
