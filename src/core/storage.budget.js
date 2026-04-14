// =============================================================================
// STORAGE.BUDGET.JS
// Tanggung jawab: Budget CRUD, period range, status kalkulasi, card priority
// Depends on: storage.base.js, storage.transaksi.js, storage.wallet.js, utils.js
// =============================================================================


// ===== BUDGET CRUD =====

// Storage format v6: { "IDR": { katId: limit }, "USD": { katId: limit } }
// getBudgets() return budget untuk active currency saja

function _getAllBudgets()      { return getData(STORAGE_KEYS.BUDGETS, {}); }
function _saveAllBudgets(data) { return setData(STORAGE_KEYS.BUDGETS, data); }

function _getActiveBudgetCurrency() {
  return (typeof isMulticurrencyEnabled === 'function' && isMulticurrencyEnabled())
    ? getActiveCurrencyCode()
    : getBaseCurrency();
}

function getBudgets() {
  const all = _getAllBudgets();
  // Safety net: format lama flat (seharusnya sudah dimigrate migrateToV6)
  const firstKey = Object.keys(all)[0];
  if (firstKey && typeof all[firstKey] === 'number') return all;
  const cur = _getActiveBudgetCurrency();
  return all[cur] || {};
}

function saveBudgets(data) {
  const all = _getAllBudgets();
  const firstKey = Object.keys(all)[0];
  const isLegacy = firstKey && typeof all[firstKey] === 'number';
  const base = isLegacy ? {} : { ...all };
  const cur = _getActiveBudgetCurrency();
  base[cur] = data;
  return _saveAllBudgets(base);
}

// ===== BUDGET PERIOD =====

function getBudgetPeriod()        { return getData(STORAGE_KEYS.BUDGET_PERIOD, 'monthly'); }
function saveBudgetPeriod(period) { return setData(STORAGE_KEYS.BUDGET_PERIOD, period); }

function getBudgetPeriodRange() {
  const period = getBudgetPeriod();
  const today  = new Date();

  if (period === 'weekly') {
    const dow          = today.getDay();       // 0=Sun
    const daysSinceMon = (dow + 6) % 7;        // 0=Mon
    const mon = new Date(today); mon.setDate(today.getDate() - daysSinceMon);
    const sun = new Date(mon);   sun.setDate(mon.getDate() + 6);
    const toStr = d => d.toISOString().split('T')[0];
    return { start: toStr(mon), end: toStr(sun), period: 'weekly' };
  }

  const { year, month } = getCurrentMonthYear();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    end:   `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    period: 'monthly',
  };
}

// ===== BUDGET STATUS =====
// Return: { [kategoriId]: { limit, used, pct, status, period, periodLabel } }

function calcBudgetStatus() {
  const budgets = getBudgets();
  if (Object.keys(budgets).length === 0) return {};

  const { start, end, period } = getBudgetPeriodRange();

  // Multicurrency: hanya hitung dari wallet currency aktif
  const activeWalletIds = (typeof isMulticurrencyEnabled === 'function' && isMulticurrencyEnabled() && getSecondaryCurrency())
    ? new Set(getActiveWallets().map(w => w.id))
    : null;

  const txInPeriod = getTransaksi().filter(tx => {
    if (tx.jenis !== 'keluar' || tx.type === 'transfer_out') return false;
    if (tx.tanggal < start || tx.tanggal > end) return false;
    if (activeWalletIds && !activeWalletIds.has(tx.wallet_id)) return false;
    return true;
  });

  const periodLabel = period === 'weekly'
    ? `Minggu ini (${formatDate(start)} – ${formatDate(end)})`
    : (() => { const { year, month } = getCurrentMonthYear(); return `${BULAN_NAMES[month]} ${year}`; })();

  const result = {};
  for (const [katId, limit] of Object.entries(budgets)) {
    if (!limit || limit <= 0) continue;
    const used   = txInPeriod.filter(tx => tx.kategori === katId).reduce((s, tx) => s + tx.nominal, 0);
    const pct    = Math.round((used / limit) * 100);
    const status = pct >= 100 ? 'jebol' : pct >= 80 ? 'warning' : 'aman';
    result[katId] = { limit, used, pct, status, period, periodLabel };
  }
  return result;
}

