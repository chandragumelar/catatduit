// =============================================================================
// CURRENCY.JS
// Tanggung jawab: Multicurrency — helper untuk base/secondary currency,
//                 exchange rate, toggle state, dan format per-currency.
// Depends on: state.js, storage.base.js
// =============================================================================


// ===== MULTICURRENCY CONFIG =====

function isMulticurrencyEnabled() {
  return getData(STORAGE_KEYS.MULTICURRENCY_ENABLED, false) === true;
}

function setMulticurrencyEnabled(val) {
  setData(STORAGE_KEYS.MULTICURRENCY_ENABLED, val);
}

// Base currency = currency utama (disimpan di CURRENCY key, existing)
function getBaseCurrency() {
  return getData(STORAGE_KEYS.CURRENCY, 'IDR');
}

// Secondary currency = currency kedua, null jika tidak aktif
function getSecondaryCurrency() {
  if (!isMulticurrencyEnabled()) return null;
  return getData(STORAGE_KEYS.SECONDARY_CURRENCY, null);
}

function setSecondaryCurrency(code) {
  setData(STORAGE_KEYS.SECONDARY_CURRENCY, code);
}

// ===== EXCHANGE RATE =====
// Rate selalu: 1 secondary = X base
// Contoh: 1 USD = 16200 IDR → simpan 16200

function getExchangeRate() {
  return getData(STORAGE_KEYS.EXCHANGE_RATE, 17000);
}

function setExchangeRate(rate) {
  const r = parseFloat(rate);
  if (!r || r <= 0) return false;
  return setData(STORAGE_KEYS.EXCHANGE_RATE, r);
}

// Convert secondary → base
function convertToBase(amountInSecondary) {
  return amountInSecondary * getExchangeRate();
}

// Convert base → secondary
function convertToSecondary(amountInBase) {
  const rate = getExchangeRate();
  if (!rate) return 0;
  return amountInBase / rate;
}

// ===== TOGGLE =====

function getActiveCurrencyToggle() {
  // Sync state dari storage saat pertama dipakai
  const stored = getData(STORAGE_KEYS.ACTIVE_CURRENCY_TOGGLE, 'base');
  state.activeCurrencyToggle = stored;
  return stored;
}

function setActiveCurrencyToggle(val) {
  // val: 'base' | 'secondary'
  state.activeCurrencyToggle = val;
  setData(STORAGE_KEYS.ACTIVE_CURRENCY_TOGGLE, val);
}

function isActiveBase() {
  return getActiveCurrencyToggle() === 'base';
}

// ===== CURRENCY INFO UNTUK ACTIVE TOGGLE =====

function getActiveCurrencyCode() {
  if (!isMulticurrencyEnabled() || isActiveBase()) return getBaseCurrency();
  return getSecondaryCurrency() || getBaseCurrency();
}

function getActiveCurrencySymbol() {
  const code = getActiveCurrencyCode();
  const opt  = CURRENCY_OPTIONS.find(c => c.code === code);
  return opt ? opt.symbol : 'Rp';
}

function getCurrencySymbolByCode(code) {
  const opt = CURRENCY_OPTIONS.find(c => c.code === code);
  return opt ? opt.symbol : code;
}

// ===== WALLET CURRENCY =====
// Setiap wallet punya field `currency` (default: base currency)
// Wallet dengan currency === secondary hanya muncul saat toggle secondary

function getWalletCurrency(wallet) {
  return wallet.currency || getBaseCurrency();
}

function isWalletMatchesToggle(wallet) {
  const activeCode = getActiveCurrencyCode();
  return getWalletCurrency(wallet) === activeCode;
}

// Filter wallets sesuai toggle aktif
function getActiveWallets() {
  return getWallets().filter(w => !w.hidden && isWalletMatchesToggle(w));
}

// Semua wallets secondary (untuk cross-currency transfer)
function getSecondaryWallets() {
  const sec = getSecondaryCurrency();
  if (!sec) return [];
  return getWallets().filter(w => !w.hidden && getWalletCurrency(w) === sec);
}

function getBaseWallets() {
  const base = getBaseCurrency();
  return getWallets().filter(w => !w.hidden && getWalletCurrency(w) === base);
}

// ===== FORMAT DENGAN CURRENCY AKTIF =====

function formatWithActiveCurrency(angka) {
  if (angka === null || angka === undefined || isNaN(angka)) {
    return getActiveCurrencySymbol() + ' 0';
  }
  const n   = Number(angka);
  const sym = getActiveCurrencySymbol();
  return (n < 0 ? '-' + sym + ' ' : sym + ' ') + Math.abs(n).toLocaleString('id-ID');
}

// Format dengan currency spesifik (untuk cross-currency display)
function formatWithCurrency(angka, currencyCode) {
  const sym = getCurrencySymbolByCode(currencyCode);
  const n   = Number(angka) || 0;
  return (n < 0 ? '-' + sym + ' ' : sym + ' ') + Math.abs(n).toLocaleString('id-ID');
}

// ===== RATE CHIP HTML =====
// Chip kecil yang tampil di home dekat toggle: "1 USD = Rp 16.200 ✏️"

function buildRateChipHTML() {
  if (!isMulticurrencyEnabled()) return '';
  const sec     = getSecondaryCurrency();
  if (!sec) return '';
  const base    = getBaseCurrency();
  const rate    = getExchangeRate();
  const secSym  = getCurrencySymbolByCode(sec);
  const baseSym = getCurrencySymbolByCode(base);
  const rateStr = rate.toLocaleString('id-ID');
  return `
    <div class="currency-rate-chip">
      <span class="currency-rate-chip-text">1 ${secSym} = ${baseSym} ${rateStr}</span>
      <button class="currency-rate-chip-ubah" id="btn-rate-chip" title="Atur kurs transfer">✏️</button>
    </div>`;
}

// ===== TOGGLE HTML =====

function buildCurrencyToggleHTML() {
  if (!isMulticurrencyEnabled()) return '';
  const sec      = getSecondaryCurrency();
  if (!sec) return '';
  const base     = getBaseCurrency();
  const isBase   = isActiveBase();
  return `
    <div class="currency-toggle-section" id="currency-toggle-wrap">
      <div class="currency-toggle-label">Lihat keuangan dalam:</div>
      <div class="currency-toggle-row">
        <div class="currency-toggle" id="currency-toggle-track" data-active="${isBase ? 'base' : 'secondary'}">
          <button class="currency-toggle-btn ${isBase ? 'active' : ''}" data-toggle="base">${base}</button>
          <button class="currency-toggle-btn ${!isBase ? 'active' : ''}" data-toggle="secondary">${sec}</button>
        </div>
        <div class="currency-rate-section">
          <div class="currency-toggle-label" style="text-align:right;">Kurs transfer:</div>
          ${buildRateChipHTML()}
        </div>
      </div>
    </div>`;
}
