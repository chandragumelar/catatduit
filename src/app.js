// =============================================================================
// APP.JS
// Tanggung jawab: Boot sequence dan flow onboarding percakapan
// Depends on: state.js, utils.js, storage.js, ui.js, pwa.js
// =============================================================================


// ===== STATE ONBOARDING =====
// _ob = temporary onboarding state, tidak disimpan sampai selesai
const _ob = {
  nama: '',
  walletIds: [],
  step: 1,
  customWallets: [],
};

// ===== BOOT =====

function init() {
  try {
    localStorage.setItem('_t', '1');
    localStorage.removeItem('_t');
  } catch (e) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;padding:24px;text-align:center;font-family:sans-serif;"><p>Browser kamu tidak mendukung penyimpanan lokal. Coba gunakan Chrome atau Firefox.</p></div>';
    return;
  }

  const nav = document.getElementById('bottom-nav');
  if (nav) nav.classList.add('hidden');

  if (!getData(STORAGE_KEYS.ONBOARDING, false)) {
    _showScreen('screen-onboarding');
    runMigrations();
    initOnboarding();
    initBottomNav();
    initInputPage();
    return;
  }

  runMigrations();
  initBottomNav();
  initInputPage();
  initQuickCapture();
  initPWA();
  if (typeof checkReEntryNotif === 'function') checkReEntryNotif();
  if (nav) nav.classList.remove('hidden');
  showApp();
}

function _showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

function showApp() {
  _showScreen('screen-app');
  // Pastikan prefix mata uang di input page sesuai setting
  const pfx = document.getElementById('input-currency-prefix');
  if (pfx) pfx.textContent = getCurrencySymbol();
  navigateTo('dashboard');
  if (window.lucide) lucide.createIcons();
}

// ===== ONBOARDING CONTROLLER =====

function initOnboarding() {
  document.getElementById('bottom-nav')?.classList.add('hidden');
  _renderOnboardingStep(1);
}

function _renderOnboardingStep(step) {
  _ob.step = step;
  const wrap = document.getElementById('onboarding-dynamic');
  if (!wrap) return;

  // hide logo, title, tagline on step 2 & 3
  const logo    = document.querySelector('.onboarding-logo');
  const title   = document.querySelector('.onboarding-title');
  const tagline = document.querySelector('.onboarding-tagline');
  const hide = step > 1;
  logo?.classList.toggle('onboarding-logo--hidden', hide);
  title?.classList.toggle('onboarding-title--hidden', hide);
  tagline?.classList.toggle('onboarding-tagline--hidden', hide);

  const renderers = [null, _stepNama, _stepWallet, _stepSaldo];
  wrap.innerHTML = '';
  wrap.appendChild(_stepIndicator(step, 3));
  wrap.appendChild(renderers[step]());

  if (window.lucide) lucide.createIcons();

  // focus input pertama di step baru
  setTimeout(() => wrap.querySelector('input')?.focus(), 250);
}

// ===== STEP INDICATOR =====

function _stepIndicator(current, total) {
  const el = document.createElement('p');
  el.className = 'onboarding-step-indicator';
  el.textContent = `Langkah ${current} dari ${total}`;
  return el;
}

// ===== STEP 1: Nama =====

function _stepNama() {
  const el = document.createElement('div');
  el.className = 'onboarding-card';
  el.innerHTML = `
    <p class="onboarding-question">Halo! Siapa namamu?</p>
    <p class="onboarding-trust"><i data-lucide="lock" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i>Semua catatan tersimpan langsung di HP kamu — tidak ada server, tidak ada yang bisa lihat.</p>
    <input type="text" id="ob-nama" class="onboarding-input" placeholder="Contoh: Desi" maxlength="30" autocomplete="off" />
    <p class="onboarding-hint">Nama ini akan muncul di sapaan harian kamu</p>
    <p class="onboarding-error" id="ob-nama-error"></p>
    <button id="ob-btn-nama" class="btn-primary" disabled>Mulai →</button>`;

  el.querySelector('#ob-nama').addEventListener('input', (e) => {
    el.querySelector('#ob-btn-nama').disabled = e.target.value.trim().length === 0;
    el.querySelector('#ob-nama-error').textContent = '';
  });
  el.querySelector('#ob-nama').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !el.querySelector('#ob-btn-nama').disabled) el.querySelector('#ob-btn-nama').click();
  });
  el.querySelector('#ob-btn-nama').addEventListener('click', () => {
    const nama = el.querySelector('#ob-nama').value.trim();
    if (!nama) { el.querySelector('#ob-nama-error').textContent = 'Nama tidak boleh kosong.'; return; }
    _ob.nama = nama;
    setData(STORAGE_KEYS.NAMA, nama);
    _renderOnboardingStep(2);
  });

  return el;
}

// ===== STEP 2: Pilih Wallet =====

function _stepWallet() {
  const el = document.createElement('div');
  el.className = 'onboarding-card';
  el.innerHTML = `
    <p class="onboarding-question">Dompet mana yang kamu punya?</p>
    <p class="onboarding-sub" style="margin-bottom:16px;">Pilih yang kamu pakai — bisa lebih dari satu dan bisa diubah kapan saja.</p>
    <div class="wallet-preset-grid" id="ob-wallet-grid"></div>
    <div id="ob-custom-wallets"></div>
    <button class="btn-text-small" id="ob-btn-tambah-wallet" style="margin-top:8px;">+ Tambah dompet lain</button>
    <p class="onboarding-error" id="ob-wallet-error"></p>
    <button id="ob-btn-wallet" class="btn-primary" style="margin-top:16px;" disabled>Lanjut →</button>`;

  const grid = el.querySelector('#ob-wallet-grid');

  // Render preset tiles
  WALLET_PRESETS.forEach(preset => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'wallet-preset-tile';
    tile.dataset.id = preset.id;
    tile.innerHTML = `<span class="wallet-preset-icon"><i data-lucide="${preset.lucideIcon}"></i></span><span class="wallet-preset-nama">${escHtml(preset.nama)}</span>`;
    tile.addEventListener('click', () => {
      tile.classList.toggle('selected');
      const idx = _ob.walletIds.indexOf(preset.id);
      if (idx === -1) _ob.walletIds.push(preset.id);
      else _ob.walletIds.splice(idx, 1);
      _updateWalletBtn(el);
    });
    grid.appendChild(tile);
  });

  // Tambah wallet custom
  el.querySelector('#ob-btn-tambah-wallet').addEventListener('click', () => {
    _addCustomWalletField(el);
  });

  el.querySelector('#ob-btn-wallet').addEventListener('click', () => {
    if (_ob.walletIds.length === 0 && _ob.customWallets.length === 0) {
      el.querySelector('#ob-wallet-error').textContent = 'Pilih minimal satu dompet.';
      return;
    }
    _renderOnboardingStep(3);
  });

  return el;
}

function _addCustomWalletField(el) {
  const wrap = el.querySelector('#ob-custom-wallets');
  const row = document.createElement('div');
  row.className = 'ob-custom-wallet-row';
  row.innerHTML = `
    <input type="text" class="onboarding-input ob-custom-nama" placeholder="Nama dompet (contoh: Jenius)" maxlength="20" style="margin-bottom:0;" />
    <button type="button" class="btn-icon-sm ob-confirm-custom">+ Tambah</button>
    <button type="button" class="btn-icon-sm danger ob-remove-custom">✕</button>`;
  row.querySelector('.ob-confirm-custom').addEventListener('click', () => {
    const nama = row.querySelector('.ob-custom-nama').value.trim();
    if (!nama) return;
    const idx = Array.from(wrap.children).indexOf(row);
    _ob.customWallets[idx] = { nama, icon: '💳' };
    row.querySelector('.ob-confirm-custom').disabled = true;
    row.querySelector('.ob-confirm-custom').textContent = '✓';
    _updateWalletBtn(el);
  });
  row.querySelector('.ob-remove-custom').addEventListener('click', () => {
    const idx = row.dataset.customIdx;
    if (idx !== undefined) _ob.customWallets.splice(parseInt(idx), 1);
    row.remove();
    _updateWalletBtn(el);
  });
  wrap.appendChild(row);
}

function _updateWalletBtn(el) {
  const hasSelection = _ob.walletIds.length > 0 || _ob.customWallets.filter(Boolean).length > 0;
  el.querySelector('#ob-btn-wallet').disabled = !hasSelection;
  el.querySelector('#ob-wallet-error').textContent = '';
}

// ===== STEP 3: Saldo per Wallet =====

function _stepSaldo() {
  // Susun daftar wallet yang dipilih
  const selectedWallets = [
    ..._ob.walletIds.map(id => WALLET_PRESETS.find(p => p.id === id)).filter(Boolean),
    ..._ob.customWallets.filter(Boolean).map((w, i) => ({ id: `custom_${i}`, ...w })),
  ];

  const el = document.createElement('div');
  el.className = 'onboarding-card';
  el.innerHTML = `
    <p class="onboarding-question">Berapa isi masing-masing dompet sekarang?</p>
    <p class="onboarding-sub" style="margin-bottom:8px;">Boleh perkiraan dulu — ini bisa diubah kapan saja.</p>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
      <span class="onboarding-label-sm">Simbol mata uang:</span>
      <select id="ob-currency-select" style="font-size:12px;padding:2px 6px;border:1px solid var(--gray-200);border-radius:6px;background:var(--surface);color:var(--text-primary);cursor:pointer;">
        <option value="IDR">Rp — Rupiah</option>
        <option value="USD">$ — Dollar</option>
        <option value="MYR">RM — Ringgit</option>
        <option value="PHP">₱ — Peso</option>
        <option value="THB">฿ — Baht</option>
        <option value="SGD">SGD — Singapore Dollar</option>
      </select>
    </div>
    <div id="ob-saldo-fields"></div>
    <p class="onboarding-error" id="ob-saldo-error"></p>
    <button id="ob-btn-selesai" class="btn-primary" style="margin-top:16px;">Ayo Mulai! 🎉</button>`;

  const fieldsWrap = el.querySelector('#ob-saldo-fields');
  selectedWallets.forEach(wallet => {
    const row = document.createElement('div');
    row.className = 'ob-saldo-row';
    row.innerHTML = `
      <label class="ob-saldo-label">${wallet.icon} ${escHtml(wallet.nama)}</label>
      <div class="nominal-wrap">
        <span class="nominal-prefix">${getCurrencySymbol()}</span>
        <input type="text" class="input-nominal ob-saldo-input" data-wallet-id="${wallet.id}" placeholder="0" inputmode="numeric" />
      </div>`;
    row.querySelector('.ob-saldo-input').addEventListener('input', (e) => {
      const raw = e.target.value.replace(/\D/g, '');
      e.target.value = raw ? formatNominalInput(Math.min(parseInt(raw, 10), MAX_NOMINAL)) : '';
    });
    fieldsWrap.appendChild(row);
  });

  // R1: Inline currency selector — simpan pilihan langsung, tidak redirect
  el.querySelector('#ob-currency-select')?.addEventListener('change', (e) => {
    setData(STORAGE_KEYS.CURRENCY, e.target.value);
    // Update prefix labels yang sudah ter-render
    const sym = getCurrencySymbol();
    el.querySelectorAll('.nominal-prefix').forEach(span => { span.textContent = sym; });
  });
  // Set default value sesuai setting yang sudah ada (kalau ada)
  const existingCurrency = getData(STORAGE_KEYS.CURRENCY, 'IDR');
  const currencySelect = el.querySelector('#ob-currency-select');
  if (currencySelect) currencySelect.value = existingCurrency;

  el.querySelector('#ob-btn-selesai').addEventListener('click', () => {
    // Simpan wallets dengan saldo masing-masing
    const wallets = selectedWallets.map(wallet => {
      const input = fieldsWrap.querySelector(`[data-wallet-id="${wallet.id}"]`);
      const saldo = input ? parseNominal(input.value) : 0;
      return { id: wallet.id, nama: wallet.nama, icon: wallet.icon, saldo_awal: saldo };
    });

    saveWallets(wallets);
    setData(STORAGE_KEYS.ONBOARDING, true);
    setData(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION);

    // legacy: simpan total saldo awal untuk kompatibilitas
    const totalSaldo = wallets.reduce((s, w) => s + w.saldo_awal, 0);
    saveSaldoAwal(totalSaldo);

    document.getElementById('bottom-nav')?.classList.remove('hidden');
    showApp();
  });

  return el;
}

// ===== SHOW APP =====

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration failed (expected in file:// or dev):', err);
    });
  });
}
