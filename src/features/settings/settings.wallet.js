// =============================================================================
// SETTINGS.WALLET.JS
// Tanggung jawab: Bottom sheet tambah/edit wallet
// Depends on: storage.wallet.js, storage.base.js, utils.js, shared/bottom-sheet.js
// =============================================================================


// Re-evaluate dan sync multicurrency state berdasarkan actual wallet list.
// Dipanggil setelah tambah atau edit wallet — satu-satunya sumber kebenaran.
function _syncMulticurrencyState(wallets) {
  const baseCode = getBaseCurrency();
  const allCurrencies = new Set(wallets.map(w => w.currency || baseCode));
  allCurrencies.delete(baseCode);
  const foreignCode = allCurrencies.size > 0 ? [...allCurrencies][0] : null;

  if (foreignCode) {
    // Ada 2 currency → enable multicurrency
    const prevSecondary = getSecondaryCurrency();
    setMulticurrencyEnabled(true);
    setSecondaryCurrency(foreignCode);
    // Reset toggle ke base hanya kalau secondary berubah (cegah reset user preference)
    if (prevSecondary !== foreignCode) {
      setActiveCurrencyToggle('base');
    }
  } else {
    // Semua wallet pakai 1 currency → disable multicurrency
    setMulticurrencyEnabled(false);
    setSecondaryCurrency(null);
    setActiveCurrencyToggle('base');
  }
}

function _showWalletSheet(idx) {
  const wallets  = getWallets();
  const isEdit   = idx !== null;
  const w        = isEdit ? wallets[idx] : null;
  const isMulti  = isMulticurrencyEnabled();
  const baseCode = getBaseCurrency();
  const secCode  = getSecondaryCurrency();

  // Datalist untuk nama dompet — suggestion dari WALLET_PRESETS, tetap bisa custom
  const namaDatalist = `
    <datalist id="bs-wallet-nama-list">
      ${WALLET_PRESETS.map(p => `<option value="${escHtml(p.nama)}">`).join('')}
    </datalist>`;

  // Currency selector — selalu tampil (tidak terikat multicurrency flag)
  const wCurrency     = w?.currency || baseCode;
  const currencyField = `
    <div class="bottom-sheet-field">
      <label class="input-label">Mata uang dompet ini</label>
      <select id="bs-wallet-currency" class="bs-wallet-currency-select">
        ${CURRENCY_OPTIONS.map(c => `
          <option value="${c.code}"${c.code === wCurrency ? ' selected' : ''}>${c.label}</option>`).join('')}
      </select>
    </div>`;

  const activeSym = getCurrencySymbolByCode(wCurrency);

  _openBottomSheet({
    title: isEdit ? 'Edit Dompet' : 'Tambah Dompet',
    fields: `
      ${namaDatalist}
      <div class="bottom-sheet-field">
        <label class="input-label">Nama dompet</label>
        <input type="text" id="bs-wallet-nama" class="input-field"
          placeholder="contoh: BCA, GoPay, Cash"
          value="${escHtml(w?.nama || '')}" maxlength="20"
          list="bs-wallet-nama-list" autocomplete="off" />
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

      // Datalist nama — resolve icon & id dari preset saat user pilih suggestion
      const namaInput = document.getElementById('bs-wallet-nama');
      if (namaInput) {
        namaInput.addEventListener('input', () => {
          const match = WALLET_PRESETS.find(
            p => p.nama.toLowerCase() === namaInput.value.trim().toLowerCase()
          );
          namaInput.dataset.resolvedIcon = match ? match.icon : '';
          namaInput.dataset.resolvedId   = match ? match.id   : '';
        });
      }

      // Currency select — update symbol prefix saat user ganti currency
      const currencySelect = document.getElementById('bs-wallet-currency');
      if (currencySelect) {
        currencySelect.addEventListener('change', () => {
          const prefix = document.getElementById('bs-saldo-prefix');
          if (prefix) prefix.textContent = getCurrencySymbolByCode(currencySelect.value);
        });
      }
    },
    onConfirm: () => {
      const nama     = document.getElementById('bs-wallet-nama').value.trim();
      const saldo    = parseNominal(document.getElementById('bs-wallet-saldo').value);
      const currency = document.getElementById('bs-wallet-currency')?.value || baseCode;
      if (!nama) return 'Nama dompet tidak boleh kosong.';

      const matched = WALLET_PRESETS.find(
        p => p.nama.toLowerCase() === nama.toLowerCase()
      );
      const icon = matched?.icon || w?.icon || '💳';
      const id   = w?.id || matched?.id || generateId();

      if (isEdit) {
        wallets[idx] = { ...w, nama, icon, saldo_awal: saldo, currency };
      } else {
        wallets.push({ id, nama, icon, saldo_awal: saldo, currency, hidden: false });
      }

      // Validasi max 2 currency — cek sebelum simpan
      if (!isEdit) {
        const currentBase = getBaseCurrency();
        const existingCurrencies = new Set(wallets.slice(0, -1).map(w => w.currency || currentBase));
        const isNewCurrency = !existingCurrencies.has(currency);
        const alreadyHasTwoCurrencies = existingCurrencies.size >= 2;
        if (isNewCurrency && alreadyHasTwoCurrencies) {
          wallets.pop();
          const existing = [...existingCurrencies].join(' dan ');
          return `CatatDuit hanya mendukung 2 mata uang sekaligus. Kamu sudah punya ${existing} — yuk pilih salah satunya untuk dompet ini.`;
        }
      }

      saveWallets(wallets);

      // Sync base currency kalau wallet pertama (dominantBase) ganti currency
      if (isEdit && idx === 0 && currency !== getBaseCurrency()) {
        setData(STORAGE_KEYS.CURRENCY, currency);
      }

      // Re-evaluate multicurrency state berdasarkan actual wallets setelah save
      _syncMulticurrencyState(wallets);

      showToast(isEdit ? 'Dompet diperbarui.' : 'Dompet ditambahkan!');
      renderSettings();
      return null;
    },
  });
}
