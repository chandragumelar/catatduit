// =============================================================================
// STORAGE.WALLET.JS
// Tanggung jawab: Wallet CRUD, kalkulasi saldo, tagihan, transfer atomik
// Depends on: storage.base.js, storage.transaksi.js, utils.js
// =============================================================================


// ===== WALLETS =====

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

function getSaldoWallet(walletId) {
  const wallet = getWalletById(walletId);
  let saldo = wallet.saldo_awal || 0;
  getTransaksi().forEach(tx => {
    if (tx.wallet_id !== walletId) return;
    if (tx.jenis === 'masuk')       saldo += tx.nominal;
    else if (tx.jenis === 'keluar') saldo -= tx.nominal;
  });
  return saldo;
}

function getSaldoTotal() {
  // Jika multicurrency aktif, hitung saldo hanya dari wallet yang sesuai toggle
  if (typeof isMulticurrencyEnabled === 'function' && isMulticurrencyEnabled()) {
    return getActiveWallets().reduce((sum, w) => sum + getSaldoWallet(w.id), 0);
  }
  return getWallets().reduce((sum, w) => sum + getSaldoWallet(w.id), 0);
}

function _buildDefaultWallet() {
  return {
    id: DEFAULT_WALLET_ID,
    nama: 'Dompet Utama',
    icon: '👛',
    saldo_awal: getData(STORAGE_KEYS.SALDO_AWAL, 0) || 0,
    currency: getBaseCurrency(), // Multicurrency: wallet default = base currency
  };
}

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
  const idx  = list.findIndex(t => t.id === tagihanId);
  if (idx === -1) return false;
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  if (!list[idx].paidMonths.includes(key)) list[idx].paidMonths.push(key);
  return saveTagihan(list);
}

// ===== TRANSFER ATOMIK =====
// tx.type: 'transfer_out' | 'transfer_in' — pair diikat oleh group_id

function createTransferAtomic({ fromWalletId, toWalletId, nominal, tanggal, catatan = '' }) {
  const groupId = generateId();
  const now     = Date.now();
  const txDate  = tanggal || getTodayStr();

  const txOut = {
    id: generateId(), jenis: 'keluar',
    nominal: Math.min(nominal, MAX_NOMINAL),
    kategori: 'transfer_keluar', tanggal: txDate,
    catatan: catatan || `Transfer ke ${getWalletById(toWalletId).nama}`,
    wallet_id: fromWalletId, timestamp: now,
    type: 'transfer_out', group_id: groupId, peer_wallet_id: toWalletId,
  };

  const txIn = {
    id: generateId(), jenis: 'masuk',
    nominal: Math.min(nominal, MAX_NOMINAL),
    kategori: 'transfer_masuk', tanggal: txDate,
    catatan: catatan || `Transfer dari ${getWalletById(fromWalletId).nama}`,
    wallet_id: toWalletId, timestamp: now + 1,
    type: 'transfer_in', group_id: groupId, peer_wallet_id: fromWalletId,
  };

  return { txOut, txIn, groupId };
}

function saveTransferAtomic({ fromWalletId, toWalletId, nominal, tanggal, catatan }) {
  if (!fromWalletId || !toWalletId || fromWalletId === toWalletId) {
    showToast('❌ Pilih dua wallet yang berbeda.'); return false;
  }
  if (!nominal || nominal <= 0) { showToast('❌ Nominal tidak valid.'); return false; }
  const { txOut, txIn } = createTransferAtomic({ fromWalletId, toWalletId, nominal, tanggal, catatan });
  const txList = getTransaksi();
  txList.push(txOut, txIn);
  return saveTransaksi(txList);
}

function deleteTransferAtomic(txId) {
  const txList   = getTransaksi();
  const tx       = txList.find(t => t.id === txId);
  if (!tx || !tx.group_id) return saveTransaksi(txList.filter(t => t.id !== txId));
  const filtered = txList.filter(t => t.group_id !== tx.group_id);
  const ok = saveTransaksi(filtered);
  if (ok) invalidateTransaksiCache();
  return ok;
}

function getTransferPeer(tx) {
  if (!tx.group_id) return null;
  return getTransaksi().find(t => t.group_id === tx.group_id && t.id !== tx.id) || null;
}
