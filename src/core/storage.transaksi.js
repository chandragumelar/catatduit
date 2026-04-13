// =============================================================================
// STORAGE.TRANSAKSI.JS
// Tanggung jawab: CRUD transaksi (cache, save, invalidate), export CSV, import CSV
// Depends on: storage.base.js, storage.wallet.js, utils.js
// =============================================================================


// ===== CACHE =====

let _transaksiCache = null;

function getTransaksi() {
  if (_transaksiCache !== null) return _transaksiCache;
  _transaksiCache = getData(STORAGE_KEYS.TRANSAKSI, []);
  return _transaksiCache;
}

function saveTransaksi(data) {
  const ok = setData(STORAGE_KEYS.TRANSAKSI, data);
  if (!ok) { showToast('❌ Gagal menyimpan. Coba lagi.'); return false; }
  _transaksiCache = data;
  if (typeof checkBudgetNotifOnSave === 'function') checkBudgetNotifOnSave();
  return true;
}

function invalidateTransaksiCache() {
  _transaksiCache = null;
}

// ===== EXPORT CSV =====

function exportCSV() {
  const txList  = getTransaksi().sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const wallets = getWallets();
  const header  = 'Tanggal,Jenis,Nominal,Kategori,Wallet,Catatan\n';
  const rows    = txList.map(tx => {
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
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `catatduit_${getTodayStr()}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('File berhasil diunduh 📤');
}

// ===== IMPORT CSV =====

function handleImport(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) { showToast('File harus berformat .csv'); return; }
  if (file.size > 5 * 1024 * 1024) { showToast('File terlalu besar. Maksimal 5MB.'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = _parseImportCSV(e.target.result);
    showToast(result.message, 3500);
    if (result.imported > 0) renderDashboard();
  };
  reader.readAsText(file);
}

function _parseImportCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { imported: 0, message: 'File CSV kosong.' };

  const header = lines[0].toLowerCase();
  if (!header.includes('tanggal') || !header.includes('jenis') || !header.includes('nominal')) {
    return { imported: 0, message: 'Format tidak sesuai. Gunakan file export dari CatatDuit.' };
  }

  const hasWalletCol = header.includes('wallet');
  const txList       = getTransaksi();
  const katList      = [...getKategori().keluar, ...getKategori().masuk, ...KATEGORI_DEFAULT.nabung];
  const wallets      = getWallets();
  const existingFP   = new Set(txList.map(tx => `${tx.tanggal}|${tx.jenis}|${tx.nominal}|${tx.kategori}`));

  let imported = 0, skipped = 0, duped = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim(); if (!line) continue;
    const cols = parseCSVLine(line); if (cols.length < 4) { skipped++; continue; }

    const [tanggal, jenis, nominalStr, kategoriNama] = cols;
    const walletNama = hasWalletCol ? (cols[4] || '') : '';
    const catatan    = hasWalletCol ? (cols[5] || '') : (cols[4] || '');
    const nominal    = parseInt(nominalStr, 10);

    if (isNaN(nominal) || nominal <= 0)             { skipped++; continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal.trim())) { skipped++; continue; }

    const jenisNorm = jenis.toLowerCase().trim() === 'masuk' ? 'masuk'
      : jenis.toLowerCase().trim() === 'nabung' ? 'nabung' : 'keluar';
    const matchedKat  = katList.find(k => k.nama.toLowerCase() === kategoriNama.toLowerCase().trim());
    const kategoriId  = matchedKat ? matchedKat.id
      : (jenisNorm === 'masuk' ? 'lainnya_masuk' : jenisNorm === 'nabung' ? 'lainnya_nabung' : 'lainnya_keluar');
    const matchedW    = wallets.find(w => w.nama.toLowerCase() === walletNama.toLowerCase().trim());
    const walletId    = matchedW ? matchedW.id : DEFAULT_WALLET_ID;
    const tgl         = tanggal.trim();
    const fp          = `${tgl}|${jenisNorm}|${nominal}|${kategoriId}`;

    if (existingFP.has(fp)) { duped++; continue; }
    existingFP.add(fp);
    txList.push({
      id: generateId(), jenis: jenisNorm,
      nominal: Math.min(nominal, MAX_NOMINAL),
      kategori: kategoriId, tanggal: tgl, catatan: catatan.trim(),
      wallet_id: walletId, timestamp: new Date(tgl + 'T12:00:00').getTime(),
    });
    imported++;
  }

  saveTransaksi(txList);
  const parts = [];
  if (imported > 0) parts.push(`${imported} catatan diimpor`);
  if (duped > 0)    parts.push(`${duped} duplikat dilewati`);
  if (skipped > 0)  parts.push(`${skipped} tidak valid`);
  return { imported, message: parts.join(', ') + (imported > 0 ? ' 📥' : '') };
}
