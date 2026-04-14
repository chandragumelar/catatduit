// =============================================================================
// STORAGE.MIGRATION.JS
// Tanggung jawab: Schema migration (v2→v3, v3→v4). Dipanggil sekali saat app init.
// Depends on: storage.base.js, storage.transaksi.js, storage.wallet.js, utils.js
// =============================================================================


// ===== MIGRATION v2 → v3 =====

function migrateToV3() {
  const currentVersion = getData(STORAGE_KEYS.SCHEMA_VERSION, 0);
  if (currentVersion >= 3) return;

  const txList = getData(STORAGE_KEYS.TRANSAKSI, []);
  let changed = false;

  txList.forEach(tx => {
    if (!tx.wallet_id) { tx.wallet_id = DEFAULT_WALLET_ID; changed = true; }
    if (!tx.timestamp) {
      tx.timestamp = tx.tanggal
        ? new Date(tx.tanggal + 'T12:00:00').getTime()
        : Date.now();
      changed = true;
    }
  });

  if (changed) setData(STORAGE_KEYS.TRANSAKSI, txList);
  if (!getData(STORAGE_KEYS.WALLETS, null)) saveWallets([_buildDefaultWallet()]);
  setData(STORAGE_KEYS.SCHEMA_VERSION, 3);
  invalidateTransaksiCache();
}

// ===== MIGRATION v3 → v4 =====
// Tambah kategori transfer ke default jika belum ada

function migrateToV4() {
  const currentVersion = getData(STORAGE_KEYS.SCHEMA_VERSION, 0);
  if (currentVersion >= 4) return;

  const kat = getData(STORAGE_KEYS.KATEGORI, null);
  if (kat) {
    let changed = false;
    if (!kat.keluar.find(k => k.id === 'transfer_keluar')) {
      kat.keluar.push({ id: 'transfer_keluar', nama: 'Transfer Keluar', icon: '↗️' });
      changed = true;
    }
    if (!kat.masuk.find(k => k.id === 'transfer_masuk')) {
      const idx = kat.masuk.findIndex(k => k.id === 'transfer_masuk');
      if (idx === -1) kat.masuk.push({ id: 'transfer_masuk', nama: 'Transfer Masuk', icon: '↙️' });
      changed = true;
    }
    if (changed) setData(STORAGE_KEYS.KATEGORI, kat);
  }

  setData(STORAGE_KEYS.SCHEMA_VERSION, 4);
  invalidateTransaksiCache();
}

// ===== MIGRATION v4 → v5 =====
// Assign field `currency` ke semua wallet existing (default: base currency)
// Toggle multicurrency tidak muncul sampai user aktifkan manual

function migrateToV5() {
  const currentVersion = getData(STORAGE_KEYS.SCHEMA_VERSION, 0);
  if (currentVersion >= 5) return;

  const wallets = getData(STORAGE_KEYS.WALLETS, null);
  if (wallets) {
    const base    = getData(STORAGE_KEYS.CURRENCY, 'IDR');
    let changed   = false;
    wallets.forEach(w => {
      if (!w.currency) { w.currency = base; changed = true; }
    });
    if (changed) setData(STORAGE_KEYS.WALLETS, wallets);
  }

  setData(STORAGE_KEYS.SCHEMA_VERSION, 5);
}

// ===== MIGRATION v5 → v6 =====
// Convert budget dari format flat { katId: limit }
// ke format per-currency { "IDR": { katId: limit } }

function migrateToV6() {
  const currentVersion = getData(STORAGE_KEYS.SCHEMA_VERSION, 0);
  if (currentVersion >= 6) return;

  const budgets = getData(STORAGE_KEYS.BUDGETS, {});
  const firstKey = Object.keys(budgets)[0];
  // Hanya migrate jika format lama (value adalah number, bukan object)
  if (firstKey && typeof budgets[firstKey] === 'number') {
    const base = getData(STORAGE_KEYS.CURRENCY, 'IDR');
    setData(STORAGE_KEYS.BUDGETS, { [base]: budgets });
  }

  setData(STORAGE_KEYS.SCHEMA_VERSION, 6);
}

// ===== ENTRY POINT =====
// Panggil ini satu kali dari app.js saat init

function runMigrations() {
  migrateToV3();
  migrateToV4();
  migrateToV5();
  migrateToV6();
}
