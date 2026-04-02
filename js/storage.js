// ===== STORAGE.JS — localStorage operations =====

// Cached transaksi for the session
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

function getTransaksi() {
  if (_transaksiCache !== null) return _transaksiCache;
  _transaksiCache = getData(STORAGE_KEYS.TRANSAKSI, []);
  return _transaksiCache;
}

function saveTransaksi(data) {
  const ok = setData(STORAGE_KEYS.TRANSAKSI, data);
  if (!ok) { showToast('❌ Gagal menyimpan. Coba lagi.'); return false; }
  _transaksiCache = data; // update cache
  return true;
}

function invalidateTransaksiCache() {
  _transaksiCache = null;
}

function getKategori() {
  return getData(STORAGE_KEYS.KATEGORI, null) || JSON.parse(JSON.stringify(KATEGORI_DEFAULT));
}

function saveKategori(data) { return setData(STORAGE_KEYS.KATEGORI, data); }

function getNama() { return getData(STORAGE_KEYS.NAMA, ''); }
function getSaldoAwal() { return getData(STORAGE_KEYS.SALDO_AWAL, 0) || 0; }
function saveSaldoAwal(val) { return setData(STORAGE_KEYS.SALDO_AWAL, val); }

function getTagihan() {
  const list = getData(STORAGE_KEYS.TAGIHAN, []);
  // Migration: pastikan semua item punya field isRecurring dan paidMonths
  let needsSave = false;
  list.forEach(t => {
    if (t.isRecurring === undefined) { t.isRecurring = true; needsSave = true; }
    if (!Array.isArray(t.paidMonths)) { t.paidMonths = []; needsSave = true; }
  });
  if (needsSave) setData(STORAGE_KEYS.TAGIHAN, list);
  return list;
}
function saveTagihan(data) { return setData(STORAGE_KEYS.TAGIHAN, data); }

// Helper: cek apakah tagihan sudah dibayar bulan ini
function isTagihanPaidThisMonth(tagihan, year, month) {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  return (tagihan.paidMonths || []).includes(key);
}

// Helper: mark tagihan sebagai paid bulan ini
function markTagihanPaid(tagihanId, year, month) {
  const list = getTagihan();
  const idx = list.findIndex(t => t.id === tagihanId);
  if (idx === -1) return false;
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  if (!list[idx].paidMonths.includes(key)) {
    list[idx].paidMonths.push(key);
  }
  return saveTagihan(list);
}

function getGoals() { return getData(STORAGE_KEYS.GOALS, []); }
function saveGoals(data) { return setData(STORAGE_KEYS.GOALS, data); }

function getLicense() { return getData(STORAGE_KEYS.LICENSE, null); }
function saveLicense(key) { return setData(STORAGE_KEYS.LICENSE, key); }

function getKategoriById(id, jenis) {
  const kat = getKategori();
  const list = jenis
    ? (kat[jenis] || KATEGORI_DEFAULT[jenis] || [])
    : [...kat.keluar, ...kat.masuk, ...KATEGORI_DEFAULT.nabung];
  return list.find(k => k.id === id) || KATEGORI_DEFAULT.nabung.find(k => k.id === id) || { nama: id, icon: '📦' };
}

function getKategoriFrequency(jenis) {
  const freq = {};
  getTransaksi().filter(tx => tx.jenis === jenis).forEach(tx => {
    freq[tx.kategori] = (freq[tx.kategori] || 0) + 1;
  });
  return freq;
}

function exportCSV() {
  const txList = getTransaksi().sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const header = 'Tanggal,Jenis,Nominal,Kategori,Catatan\n';
  const rows = txList.map(tx => {
    const k = getKategoriById(tx.kategori, tx.jenis);
    return [
      tx.tanggal,
      tx.jenis === 'masuk' ? 'Masuk' : tx.jenis === 'nabung' ? 'Nabung' : 'Keluar',
      tx.nominal,
      `"${k.nama.replace(/"/g, '""')}"`,
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
    let imported = 0, skipped = 0;
    const txList = getTransaksi();
    const katList = [...getKategori().keluar, ...getKategori().masuk, ...KATEGORI_DEFAULT.nabung];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim(); if (!line) continue;
      const cols = parseCSVLine(line); if (cols.length < 4) { skipped++; continue; }
      const [tanggal, jenis, nominalStr, kategoriNama, catatan = ''] = cols;
      const nominal = parseInt(nominalStr, 10);
      if (isNaN(nominal) || nominal <= 0) { skipped++; continue; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal.trim())) { skipped++; continue; }
      const jenisNorm = jenis.toLowerCase().trim() === 'masuk' ? 'masuk' : jenis.toLowerCase().trim() === 'nabung' ? 'nabung' : 'keluar';
      const matchedKat = katList.find(k => k.nama.toLowerCase() === kategoriNama.toLowerCase().trim());
      const kategoriId = matchedKat ? matchedKat.id : (jenisNorm === 'masuk' ? 'lainnya_masuk' : jenisNorm === 'nabung' ? 'lainnya_nabung' : 'lainnya_keluar');
      txList.push({ id: generateId(), jenis: jenisNorm, nominal: Math.min(nominal, MAX_NOMINAL), kategori: kategoriId, tanggal: tanggal.trim(), catatan: catatan.trim() });
      imported++;
    }
    saveTransaksi(txList);
    showToast(skipped > 0 ? `${imported} catatan diimpor, ${skipped} dilewati.` : `${imported} catatan berhasil diimpor 📥`, 3500);
    renderDashboard();
  };
  reader.readAsText(file);
}
