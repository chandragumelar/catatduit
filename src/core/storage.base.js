// =============================================================================
// STORAGE.BASE.JS
// Tanggung jawab: Primitif localStorage (getData/setData), kategori, profil,
//                 storage indicator, card collapsed state, support banner
// Depends on: state.js, utils.js
// =============================================================================


// ===== PRIMITIF =====

function getData(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function setData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') showToast('⚠️ Penyimpanan hampir penuh. Export data dulu.');
    return false;
  }
}

// ===== KATEGORI =====

function getKategori() {
  return getData(STORAGE_KEYS.KATEGORI, null) || JSON.parse(JSON.stringify(KATEGORI_DEFAULT));
}

function saveKategori(data) { return setData(STORAGE_KEYS.KATEGORI, data); }

function getKategoriById(id, jenis) {
  const kat  = getKategori();
  const list = jenis
    ? (kat[jenis] || KATEGORI_DEFAULT[jenis] || [])
    : [...kat.keluar, ...kat.masuk, ...KATEGORI_DEFAULT.nabung];
  return list.find(k => k.id === id)
    || KATEGORI_DEFAULT.nabung.find(k => k.id === id)
    || { nama: id, icon: '📦' };
}

function getKategoriFrequency(jenis) {
  const freq = {};
  getTransaksi().filter(tx => tx.jenis === jenis).forEach(tx => {
    freq[tx.kategori] = (freq[tx.kategori] || 0) + 1;
  });
  return freq;
}

// ===== PROFIL =====

function getNama()        { return getData(STORAGE_KEYS.NAMA, ''); }
function getSaldoAwal()   { return getData(STORAGE_KEYS.SALDO_AWAL, 0) || 0; }
function saveSaldoAwal(v) { return setData(STORAGE_KEYS.SALDO_AWAL, v); }

// ===== GOALS =====

function getGoals()      { return getData(STORAGE_KEYS.GOALS, []); }
function saveGoals(data) { return setData(STORAGE_KEYS.GOALS, data); }

// ===== STORAGE INDICATOR =====

function getStorageUsageKB() {
  try {
    let total = 0;
    for (const key of Object.keys(localStorage)) total += (localStorage.getItem(key) || '').length;
    return Math.round(total / 1024 * 10) / 10;
  } catch { return 0; }
}

function getStorageUsagePct() {
  return Math.min(Math.round(getStorageUsageKB() / 5120 * 100), 100);
}

// ===== CARD COLLAPSED STATE =====

function getCardCollapsed() {
  return new Set(getData(STORAGE_KEYS.CARD_COLLAPSED, []));
}

function setCardCollapsed(cardId, collapsed) {
  const current = getCardCollapsed();
  if (collapsed) current.add(cardId); else current.delete(cardId);
  setData(STORAGE_KEYS.CARD_COLLAPSED, [...current]);
}

function isCardCollapsed(cardId) {
  return getCardCollapsed().has(cardId);
}

// ===== SUPPORT BANNER =====

const SUPPORT_BANNER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

function shouldShowSupportBanner() {
  const ts = getData(STORAGE_KEYS.SUPPORT_BANNER, null);
  if (!ts) return true;
  return (Date.now() - ts) >= SUPPORT_BANNER_INTERVAL_MS;
}

function dismissSupportBanner() {
  setData(STORAGE_KEYS.SUPPORT_BANNER, Date.now());
}
