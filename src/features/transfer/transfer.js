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
  const wallets = getWallets().filter(w => !w.hidden);

  if (wallets.length < 2) {
    showToast('⚠️ Kamu butuh minimal 2 dompet untuk transfer.');
    return;
  }

  // Cek apakah ini cross-currency transfer (ada wallet dari 2 currency berbeda)
  const isCross = isMulticurrencyEnabled() && getSecondaryCurrency() &&
    wallets.some(w => getWalletCurrency(w) !== getBaseCurrency());

  _renderTransferSheet(wallets, isCross);
}

// ===== RENDER =====

function _renderTransferSheet(wallets, isCross = false) {
  // Pisahkan wallet berdasar currency jika multicurrency aktif
  const activeWallet  = getActiveWallets();
  const defaultFrom   = isCross
    ? (activeWallet[0]?.id || wallets[0].id)
    : wallets[0].id;
  const defaultTo     = isCross
    ? (wallets.find(w => w.id !== defaultFrom)?.id || wallets[1].id)
    : wallets[1].id;

  const fromWallet    = wallets.find(w => w.id === defaultFrom) || wallets[0];
  const fromCurrency  = getWalletCurrency(fromWallet);
  const fromSym       = getCurrencySymbolByCode(fromCurrency);

  // Cross-currency info label
  const crossInfoHTML = isCross ? `
    <div class="tf-cross-info" id="tf-cross-info"></div>` : '';

  _openBottomSheet({
    title: isCross ? '↗ Transfer (Tukar Mata Uang)' : '↗ Transfer Antar Dompet',
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
          ${wallets.map(w => {
            const sym = getCurrencySymbolByCode(getWalletCurrency(w));
            return `<option value="${w.id}" ${w.id === defaultTo ? 'selected' : ''}>${w.icon} ${escHtml(w.nama)} (${sym})</option>`;
          }).join('')}
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

      ${crossInfoHTML}

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
      _initTransferSheetLogic(wallets, isCross);
    },

    onConfirm: () => {
      return _handleTransferConfirm(wallets, isCross);
    },
  });
}

function _initTransferSheetLogic(wallets, isCross = false) {
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

  const _updateCrossInfo = () => {
    const infoEl = document.getElementById('tf-cross-info');
    if (!infoEl || !isCross) return;
    const fromWallet = wallets.find(w => w.id === fromEl.value);
    const toWallet   = wallets.find(w => w.id === toEl.value);
    if (!fromWallet || !toWallet) { infoEl.innerHTML = ''; return; }

    const fromCur = getWalletCurrency(fromWallet);
    const toCur   = getWalletCurrency(toWallet);
    if (fromCur === toCur) { infoEl.innerHTML = ''; return; }

    const nominal = parseNominal(nominalEl.value);
    const rate    = getExchangeRate();
    const base    = getBaseCurrency();

    let converted;
    if (fromCur !== base) {
      converted = Math.round(nominal * rate);
    } else {
      converted = Math.round(nominal / rate);
    }

    const fromSym = getCurrencySymbolByCode(fromCur);
    const toSym   = getCurrencySymbolByCode(toCur);

    infoEl.innerHTML = nominal > 0
      ? `<span class="tf-cross-label">💱 ${fromSym} ${nominal.toLocaleString('id-ID')} → ${toSym} ${converted.toLocaleString('id-ID')}</span>
         <span class="tf-cross-rate">Kurs: 1 ${getSecondaryCurrency()} = ${getCurrencySymbolByCode(base)} ${rate.toLocaleString('id-ID')}</span>`
      : '';
  };

  // Update saldo hints on wallet change
  const _updateHints = () => {
    _updateSaldoHint('tf-from-saldo', fromEl.value, wallets);
    _updateSaldoHint('tf-to-saldo',   toEl.value,   wallets);
    _validateNominalHint(nominalEl.value, fromEl.value);
    _updateFromCurrencyPrefix();
    _updateCrossInfo();
  };

  fromEl.addEventListener('change', () => {
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

  nominalEl.addEventListener('input', () => {
    const raw = nominalEl.value.replace(/\D/g, '');
    nominalEl.value = raw ? formatNominalInput(Math.min(parseInt(raw, 10), MAX_NOMINAL)) : '';
    _validateNominalHint(nominalEl.value, fromEl.value);
    _updateCrossInfo();
  });

  swapBtn.addEventListener('click', () => {
    const tmp = fromEl.value;
    fromEl.value = toEl.value;
    toEl.value   = tmp;
    _updateHints();
  });

  _updateHints();
}

function _updateSaldoHint(elId, walletId, wallets) {
  const el = document.getElementById(elId);
  if (!el) return;
  const wallet = wallets.find(w => w.id === walletId);
  if (!wallet) { el.textContent = ''; return; }
  const saldo   = getSaldoWallet(walletId);
  const wCur    = getWalletCurrency(wallet);
  el.textContent = `Saldo: ${formatWithCurrency(saldo, wCur)}`;
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

function _handleTransferConfirm(wallets, isCross = false) {
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
  const isCrossCur = fromCur !== toCur;

  let ok;
  if (isCrossCur) {
    ok = saveCrossCurrencyTransfer({ fromWalletId: fromId, toWalletId: toId, nominalFrom: nominal, tanggal, catatan });
  } else {
    ok = saveTransferAtomic({ fromWalletId: fromId, toWalletId: toId, nominal, tanggal, catatan });
  }

  if (ok) {
    invalidateTransaksiCache();
    const fromSym = getCurrencySymbolByCode(fromCur);
    showToast(`✅ Transfer ${fromSym} ${nominal.toLocaleString('id-ID')} dari ${fromWallet?.nama} ke ${toWallet?.nama} dicatat.`, 3000);
    renderDashboard();
    return null;
  }

  return 'Gagal menyimpan transfer. Coba lagi.';
}
