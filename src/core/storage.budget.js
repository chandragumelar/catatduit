// =============================================================================
// STORAGE.BUDGET.JS
// Tanggung jawab: Budget CRUD, period range, status kalkulasi, card priority
// Depends on: storage.base.js, storage.transaksi.js, storage.wallet.js, utils.js
// =============================================================================


// ===== BUDGET CRUD =====

function getBudgets()      { return getData(STORAGE_KEYS.BUDGETS, {}); }
function saveBudgets(data) { return setData(STORAGE_KEYS.BUDGETS, data); }

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

  const txInPeriod = getTransaksi().filter(tx =>
    tx.jenis === 'keluar' && tx.type !== 'transfer_out' && tx.tanggal >= start && tx.tanggal <= end
  );

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

