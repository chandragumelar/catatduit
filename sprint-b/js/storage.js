// ===== STORAGE.JS — localStorage operations (v3) =====

// ===== BASE =====

let _transaksiCache = null;

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

// ===== TRANSAKSI =====

function getTransaksi() {
  if (_transaksiCache !== null) return _transaksiCache;
  _transaksiCache = getData(STORAGE_KEYS.TRANSAKSI, []);
  return _transaksiCache;
}

function saveTransaksi(data) {
  const ok = setData(STORAGE_KEYS.TRANSAKSI, data);
  if (!ok) { showToast('❌ Gagal menyimpan. Coba lagi.'); return false; }
  _transaksiCache = data;
  // Check budget setelah simpan (pwa.js)
  if (typeof checkBudgetNotifOnSave === 'function') checkBudgetNotifOnSave();
  return true;
}

function invalidateTransaksiCache() {
  _transaksiCache = null;
}

// ===== WALLETS (v3) =====

function getWallets() {
  const stored = getData(STORAGE_KEYS.WALLETS, null);
  if (stored && stored.length > 0) return stored;
  return [_buildDefaultWallet()];
}

function saveWallets(data) {
  return setData(STORAGE_KEYS.WALLETS, data);
}

function getWalletById(id) {
  return getWallets().find(w => w.id === id) || { id, nama: 'Wallet', icon: '💳' };
}

// Saldo wallet = saldo_awal + semua masuk - semua keluar (tx di wallet itu)
// Nabung tidak mengurangi saldo (uang masih ada, hanya dicatat tujuannya)
function getSaldoWallet(walletId) {
  const wallet = getWalletById(walletId);
  let saldo = wallet.saldo_awal || 0;
  getTransaksi().forEach(tx => {
    if (tx.wallet_id !== walletId) return;
    if (tx.jenis === 'masuk') saldo += tx.nominal;
    else if (tx.jenis === 'keluar') saldo -= tx.nominal;
  });
  return saldo;
}

function getSaldoTotal() {
  return getWallets().reduce((sum, w) => sum + getSaldoWallet(w.id), 0);
}

function _buildDefaultWallet() {
  return {
    id: DEFAULT_WALLET_ID,
    nama: 'Dompet Utama',
    icon: '👛',
    saldo_awal: getData(STORAGE_KEYS.SALDO_AWAL, 0) || 0,
  };
}

// ===== MIGRATION v2 → v3 =====

function migrateToV3() {
  const currentVersion = getData(STORAGE_KEYS.SCHEMA_VERSION, 0);
  if (currentVersion >= SCHEMA_VERSION) return;

  const txList = getData(STORAGE_KEYS.TRANSAKSI, []);
  let changed = false;

  txList.forEach(tx => {
    if (!tx.wallet_id) {
      tx.wallet_id = DEFAULT_WALLET_ID;
      changed = true;
    }
    if (!tx.timestamp) {
      tx.timestamp = tx.tanggal
        ? new Date(tx.tanggal + 'T12:00:00').getTime()
        : Date.now();
      changed = true;
    }
  });

  if (changed) setData(STORAGE_KEYS.TRANSAKSI, txList);

  // buat default wallet jika belum ada
  if (!getData(STORAGE_KEYS.WALLETS, null)) {
    saveWallets([_buildDefaultWallet()]);
  }

  setData(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION);
  invalidateTransaksiCache();
}

// ===== KATEGORI =====

function getKategori() {
  return getData(STORAGE_KEYS.KATEGORI, null) || JSON.parse(JSON.stringify(KATEGORI_DEFAULT));
}

function saveKategori(data) { return setData(STORAGE_KEYS.KATEGORI, data); }

// ===== PROFILE =====

function getNama() { return getData(STORAGE_KEYS.NAMA, ''); }
function getSaldoAwal() { return getData(STORAGE_KEYS.SALDO_AWAL, 0) || 0; }
function saveSaldoAwal(val) { return setData(STORAGE_KEYS.SALDO_AWAL, val); }

// ===== TAGIHAN =====

function getTagihan() {
  const list = getData(STORAGE_KEYS.TAGIHAN, []);
  let needsSave = false;
  list.forEach(t => {
    if (t.isRecurring === undefined) { t.isRecurring = true; needsSave = true; }
    if (!Array.isArray(t.paidMonths)) { t.paidMonths = []; needsSave = true; }
  });
  if (needsSave) setData(STORAGE_KEYS.TAGIHAN, list);
  return list;
}

function saveTagihan(data) { return setData(STORAGE_KEYS.TAGIHAN, data); }

function isTagihanPaidThisMonth(tagihan, year, month) {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  return (tagihan.paidMonths || []).includes(key);
}

function markTagihanPaid(tagihanId, year, month) {
  const list = getTagihan();
  const idx = list.findIndex(t => t.id === tagihanId);
  if (idx === -1) return false;
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  if (!list[idx].paidMonths.includes(key)) list[idx].paidMonths.push(key);
  return saveTagihan(list);
}

// ===== GOALS =====

function getGoals() { return getData(STORAGE_KEYS.GOALS, []); }
function saveGoals(data) { return setData(STORAGE_KEYS.GOALS, data); }

// ===== HELPERS =====

function getKategoriById(id, jenis) {
  const kat = getKategori();
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

// ===== STORAGE INDICATOR =====

function getStorageUsageKB() {
  try {
    let total = 0;
    for (const key of Object.keys(localStorage)) {
      total += (localStorage.getItem(key) || '').length;
    }
    return Math.round(total / 1024 * 10) / 10;
  } catch { return 0; }
}

// estimasi max localStorage ~5MB = 5120 KB
function getStorageUsagePct() {
  return Math.min(Math.round(getStorageUsageKB() / 5120 * 100), 100);
}

// ===== EXPORT / IMPORT =====

function exportCSV() {
  const txList = getTransaksi().sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const wallets = getWallets();
  const header = 'Tanggal,Jenis,Nominal,Kategori,Wallet,Catatan\n';
  const rows = txList.map(tx => {
    const k = getKategoriById(tx.kategori, tx.jenis);
    const w = wallets.find(w => w.id === tx.wallet_id) || { nama: 'Utama' };
    return [
      tx.tanggal,
      tx.jenis === 'masuk' ? 'Masuk' : tx.jenis === 'nabung' ? 'Nabung' : 'Keluar',
      tx.nominal,
      `"${k.nama.replace(/"/g, '""')}"`,
      `"${w.nama.replace(/"/g, '""')}"`,
      `"${(tx.catatan || '').replace(/"/g, '""')}"`,
    ].join(',');
  }).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `catatduit_${getTodayStr()}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('File berhasil diunduh 📤');
}

function handleImport(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) { showToast('File harus berformat .csv'); return; }
  if (file.size > 5 * 1024 * 1024) { showToast('File terlalu besar. Maksimal 5MB.'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) { showToast('File CSV kosong.'); return; }
    const header = lines[0].toLowerCase();
    if (!header.includes('tanggal') || !header.includes('jenis') || !header.includes('nominal')) {
      showToast('Format tidak sesuai. Gunakan file export dari CatatDuit.'); return;
    }
    const hasWalletCol = header.includes('wallet');
    let imported = 0, skipped = 0, duped = 0;
    const txList = getTransaksi();
    const katList = [...getKategori().keluar, ...getKategori().masuk, ...KATEGORI_DEFAULT.nabung];
    const wallets = getWallets();
    // Fingerprint set untuk dedup: tanggal+jenis+nominal+kategori
    const existingFingerprints = new Set(
      txList.map(tx => `${tx.tanggal}|${tx.jenis}|${tx.nominal}|${tx.kategori}`)
    );

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim(); if (!line) continue;
      const cols = parseCSVLine(line); if (cols.length < 4) { skipped++; continue; }
      const tanggal = cols[0], jenis = cols[1], nominalStr = cols[2], kategoriNama = cols[3];
      const walletNama = hasWalletCol ? (cols[4] || '') : '';
      const catatan = hasWalletCol ? (cols[5] || '') : (cols[4] || '');

      const nominal = parseInt(nominalStr, 10);
      if (isNaN(nominal) || nominal <= 0) { skipped++; continue; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal.trim())) { skipped++; continue; }

      const jenisNorm = jenis.toLowerCase().trim() === 'masuk' ? 'masuk'
        : jenis.toLowerCase().trim() === 'nabung' ? 'nabung' : 'keluar';
      const matchedKat = katList.find(k => k.nama.toLowerCase() === kategoriNama.toLowerCase().trim());
      const kategoriId = matchedKat ? matchedKat.id
        : (jenisNorm === 'masuk' ? 'lainnya_masuk' : jenisNorm === 'nabung' ? 'lainnya_nabung' : 'lainnya_keluar');
      const matchedWallet = wallets.find(w => w.nama.toLowerCase() === walletNama.toLowerCase().trim());
      const walletId = matchedWallet ? matchedWallet.id : DEFAULT_WALLET_ID;

      const tgl = tanggal.trim();
      const fingerprint = `${tgl}|${jenisNorm}|${nominal}|${kategoriId}`;
      if (existingFingerprints.has(fingerprint)) { duped++; continue; }
      existingFingerprints.add(fingerprint);

      txList.push({
        id: generateId(),
        jenis: jenisNorm,
        nominal: Math.min(nominal, MAX_NOMINAL),
        kategori: kategoriId,
        tanggal: tgl,
        catatan: catatan.trim(),
        wallet_id: walletId,
        timestamp: new Date(tgl + 'T12:00:00').getTime(),
      });
      imported++;
    }
    saveTransaksi(txList);
    const parts = [];
    if (imported > 0) parts.push(`${imported} catatan diimpor`);
    if (duped > 0) parts.push(`${duped} duplikat dilewati`);
    if (skipped > 0) parts.push(`${skipped} tidak valid`);
    showToast(parts.join(', ') + (imported > 0 ? ' 📥' : ''), 3500);
    renderDashboard();
  };
  reader.readAsText(file);
}

// ===== BUDGETS =====

function getBudgets() { return getData(STORAGE_KEYS.BUDGETS, {}); }
function saveBudgets(data) { return setData(STORAGE_KEYS.BUDGETS, data); }

// Kalkulasi status budget bulan ini per kategori
// Return: { [kategoriId]: { limit, used, pct, status } }
// status: 'aman' | 'warning' | 'jebol'
function calcBudgetStatus() {
  const budgets = getBudgets();
  if (Object.keys(budgets).length === 0) return {};

  const { year, month } = getCurrentMonthYear();
  const txBulanIni = getTransaksi().filter(tx =>
    tx.jenis === 'keluar' && isSameMonth(tx.tanggal, year, month));

  const result = {};
  for (const [katId, limit] of Object.entries(budgets)) {
    if (!limit || limit <= 0) continue;
    const used = txBulanIni
      .filter(tx => tx.kategori === katId)
      .reduce((s, tx) => s + tx.nominal, 0);
    const pct = Math.round((used / limit) * 100);
    const status = pct >= 100 ? 'jebol' : pct >= 80 ? 'warning' : 'aman';
    result[katId] = { limit, used, pct, status };
  }
  return result;
}
