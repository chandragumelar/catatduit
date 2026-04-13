// =============================================================================
// SETTINGS.WALLET.JS
// Tanggung jawab: Bottom sheet tambah/edit wallet
// Depends on: storage.wallet.js, storage.base.js, utils.js, shared/bottom-sheet.js
// =============================================================================


function _showWalletSheet(idx) {
  const wallets  = getWallets();
  const isEdit   = idx !== null;
  const w        = isEdit ? wallets[idx] : null;
  const isMulti  = isMulticurrencyEnabled();
  const baseCode = getBaseCurrency();
  const secCode  = getSecondaryCurrency();

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

  // Currency selector — hanya tampil jika multicurrency aktif dan ada secondary currency
  const wCurrency      = w?.currency || baseCode;
  const currencyField  = (isMulti && secCode) ? `
    <div class="bottom-sheet-field">
      <label class="input-label">Mata uang dompet ini</label>
      <div class="currency-toggle" style="margin-top:4px;">
        <button type="button" class="currency-toggle-btn ${wCurrency === baseCode ? 'active' : ''}"
          id="bs-currency-base" data-currency="${baseCode}">${baseCode}</button>
        <button type="button" class="currency-toggle-btn ${wCurrency === secCode ? 'active' : ''}"
          id="bs-currency-sec" data-currency="${secCode}">${secCode}</button>
      </div>
      <input type="hidden" id="bs-wallet-currency" value="${wCurrency}" />
    </div>` : '';

  const activeCurrencyForWallet = wCurrency;
  const activeSym = getCurrencySymbolByCode(activeCurrencyForWallet);

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
      ${currencyField}
      <div class="bottom-sheet-field">
        <label class="input-label">Saldo awal</label>
        <div class="nominal-wrap">
          <span class="nominal-prefix" id="bs-saldo-prefix">${activeSym}</span>
          <input type="text" id="bs-wallet-saldo" class="input-nominal"
            placeholder="0"
            value="${w ? formatNominalInput(w.saldo_awal || 0) : ''}"
            inputmode="numeric" />
        </div>
        ${isEdit ? '<p class="bottom-sheet-hint">Saldo aktual dihitung otomatis dari transaksi. Saldo awal hanya titik mulai.</p>' : ''}
      </div>`,
    confirmText: isEdit ? 'Simpan' : 'Tambah Dompet',
    onOpen: () => {
      document.getElementById('bs-wallet-saldo').addEventListener('input', (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        e.target.value = raw ? formatNominalInput(Math.min(parseInt(raw, 10), MAX_NOMINAL)) : '';
      });

      document.querySelectorAll('#bs-wallet-preset-grid .wallet-preset-tile').forEach(tile => {
        tile.addEventListener('click', () => {
          document.querySelectorAll('#bs-wallet-preset-grid .wallet-preset-tile')
            .forEach(t => t.classList.remove('selected'));
          tile.classList.add('selected');
          document.getElementById('bs-wallet-nama').value = tile.dataset.presetNama;
        });
      });

      // Currency toggle di wallet sheet
      document.querySelectorAll('[id^="bs-currency-"]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[id^="bs-currency-"]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const chosenCode = btn.dataset.currency;
          const hiddenInput = document.getElementById('bs-wallet-currency');
          if (hiddenInput) hiddenInput.value = chosenCode;
          const prefix = document.getElementById('bs-saldo-prefix');
          if (prefix) prefix.textContent = getCurrencySymbolByCode(chosenCode);
        });
      });
    },
    onConfirm: () => {
      const nama     = document.getElementById('bs-wallet-nama').value.trim();
      const saldo    = parseNominal(document.getElementById('bs-wallet-saldo').value);
      const currency = document.getElementById('bs-wallet-currency')?.value || baseCode;
      if (!nama) return 'Nama dompet tidak boleh kosong.';

      const selectedPreset = document.querySelector('#bs-wallet-preset-grid .wallet-preset-tile.selected');
      const icon = selectedPreset?.dataset.presetIcon || w?.icon || '💳';
      const id   = w?.id || selectedPreset?.dataset.presetId || generateId();

      if (isEdit) {
        wallets[idx] = { ...w, nama, icon, saldo_awal: saldo, currency };
      } else {
        wallets.push({ id, nama, icon, saldo_awal: saldo, currency, hidden: false });
      }

      saveWallets(wallets);
      showToast(isEdit ? 'Dompet diperbarui.' : 'Dompet ditambahkan!');
      renderSettings();
      return null;
    },
  });
}
