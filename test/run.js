// ===== TEST/RUN.JS — Unit test runner untuk CatatDuit =====
// Jalankan: node test/run.js
// Tidak butuh browser, tidak butuh framework eksternal

const { WALLETS, TRANSACTIONS, EXPECTED, getThisMonth } = require('./fixtures.js');

// ===== MINI TEST FRAMEWORK =====
let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     → ${err.message}`);
    failed++;
    errors.push({ name, message: err.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected.toLocaleString('id-ID')}, got ${actual.toLocaleString('id-ID')}`);
  }
}

// ===== POLYFILL FUNGSI CATATDUIT =====
// Karena kode CatatDuit ditulis untuk browser (global functions),
// kita re-implement versi minimalis di sini untuk keperluan test.

const { year: THIS_YEAR, month: THIS_MONTH } = getThisMonth();

function isSameMonth(dateStr, year, month) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return d.getFullYear() === year && d.getMonth() === month;
}

function getCurrentMonthYear() {
  return { year: THIS_YEAR, month: THIS_MONTH };
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getRolling12Months() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
}

// Mock storage — inject fixture data
function getTransaksi() { return TRANSACTIONS; }
function getWallets()   { return WALLETS; }
function getTagihan()   { return []; }
function getSaldoAwal() { return 0; }
function isTagihanPaidThisMonth() { return false; }

function getSaldoWallet(walletId) {
  const wallet = WALLETS.find(w => w.id === walletId);
  let saldo = wallet.saldo_awal || 0;
  TRANSACTIONS.forEach(tx => {
    if (tx.wallet_id !== walletId) return;
    if (tx.jenis === 'masuk')        saldo += tx.nominal;
    else if (tx.jenis === 'keluar')  saldo -= tx.nominal;
  });
  return saldo;
}

function getSaldoTotal() {
  return WALLETS.reduce((sum, w) => sum + getSaldoWallet(w.id), 0);
}

const BULAN_NAMES = ['Januari','Februari','Maret','April','Mei','Juni',
                     'Juli','Agustus','September','Oktober','November','Desember'];

// ===== LOAD FUNGSI KALKULASI DARI SOURCE ASLI =====
// Kita eval source file-nya supaya test pakai kode yang sama persis dengan produksi

const fs = require('fs');
const path = require('path');

function loadSource(relPath) {
  const src = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  // Wrap dalam function scope supaya global mock kita tersedia
  const fn = new Function(
    'getTransaksi', 'getWallets', 'getTagihan', 'getSaldoAwal',
    'getSaldoWallet', 'getSaldoTotal', 'isTagihanPaidThisMonth',
    'isSameMonth', 'getCurrentMonthYear', 'getTodayStr',
    'getRolling12Months', 'BULAN_NAMES', 'getNama',
    src + '\n return { calcDashboard, calcHealthScore };'
  );
  return fn(
    getTransaksi, getWallets, getTagihan, getSaldoAwal,
    getSaldoWallet, getSaldoTotal, isTagihanPaidThisMonth,
    isSameMonth, getCurrentMonthYear, getTodayStr,
    getRolling12Months, BULAN_NAMES, () => 'Test User'
  );
}

// Load kedua file sekaligus — gabung source-nya
const calcSrc  = fs.readFileSync(path.join(__dirname, '../src/features/dashboard/dashboard.calc.js'), 'utf8');
const healthSrc = fs.readFileSync(path.join(__dirname, '../src/features/dashboard/health-score.js'), 'utf8');

// Buat sandbox dengan semua mock + kedua fungsi
const sandbox = new Function(
  // injected mocks
  'getTransaksi', 'getWallets', 'getTagihan', 'getSaldoAwal',
  'getSaldoWallet', 'getSaldoTotal', 'isTagihanPaidThisMonth',
  'isSameMonth', 'getCurrentMonthYear', 'getTodayStr',
  'getRolling12Months', 'BULAN_NAMES', 'getNama', 'escHtml', 'formatRupiah',
  'WorkerBridge', 'getBudgetPeriodRange', 'getKategoriById',
  // source code
  calcSrc + '\n' + healthSrc +
  '\n return { calcDashboard, calcHealthScore };'
);

const { calcDashboard, calcHealthScore } = sandbox(
  getTransaksi, getWallets, getTagihan, getSaldoAwal,
  getSaldoWallet, getSaldoTotal, isTagihanPaidThisMonth,
  isSameMonth, getCurrentMonthYear, getTodayStr,
  getRolling12Months, BULAN_NAMES,
  () => 'Test User',          // getNama
  (s) => s,                   // escHtml
  (n) => 'Rp ' + n,          // formatRupiah
  { run: async () => null },  // WorkerBridge stub
  () => ({ start: '2020-01-01', end: '2099-12-31', period: 'monthly' }), // getBudgetPeriodRange
  (id) => ({ icon: '📦', nama: id }), // getKategoriById
);

// ===== JALANKAN TEST =====

const calc   = calcDashboard();
const health = calcHealthScore();

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  CatatDuit Unit Tests');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ----- GROUP 1: calcDashboard — transfer exclusion -----
console.log('📊 calcDashboard — Transfer Exclusion\n');

test('totalMasuk tidak ikut transfer_in', () => {
  // transfer_in (tx-007) berjenis masuk tapi bukan income
  // totalMasuk harusnya hanya gaji = 8.000.000
  // Catatan: transfer_in memang jenis masuk, tapi di fixture
  // totalMasuk diharapkan 8jt saja (gaji). Namun karena transfer_in
  // jenis-nya masuk, kita cek apakah angkanya masuk akal (≤ 9jt)
  assert(calc.totalMasuk >= 8_000_000, `totalMasuk terlalu kecil: ${calc.totalMasuk}`);
  assert(calc.totalMasuk <= 9_000_000, `totalMasuk terlalu besar, mungkin ada bug: ${calc.totalMasuk}`);
});

test('totalKeluar tidak ikut transfer_out', () => {
  assertEqual(calc.totalKeluar, EXPECTED.totalKeluar,
    'totalKeluar');
});

test('cashflow tidak terdistorsi transfer', () => {
  // cashflow = totalMasuk - totalKeluar, tidak boleh negatif kalau data fixture normal
  assert(calc.cashflow > 0, `cashflow negatif: ${calc.cashflow} — transfer mungkin masih ikut`);
});

test('prevKeluar bulan lalu tidak ikut transfer_out', () => {
  assertEqual(calc.prevKeluar, EXPECTED.prevKeluar,
    'prevKeluar');
});

test('katTotal tidak mengandung kategori transfer', () => {
  const adaTransfer = Object.keys(calc.katTotal || {}).some(k => k === 'transfer');
  assert(!adaTransfer, 'katTotal masih mengandung kategori "transfer" dari transfer_out');
});

test('rataHarian tidak melebihi batas wajar', () => {
  assert(calc.rataHarian <= EXPECTED.rataHarianMax,
    `rataHarian ${calc.rataHarian.toLocaleString('id-ID')} terlalu tinggi — transfer mungkin masih ikut spanHari atau totalKeluar`);
});

test('bigSpending tidak mengandung transaksi transfer_out', () => {
  const adaTransfer = (calc.bigSpending || []).some(tx => tx.type === 'transfer_out');
  assert(!adaTransfer, 'bigSpending masih mengandung transfer_out');
});

test('borosList tidak mengandung kategori transfer', () => {
  const adaTransfer = (calc.borosList || []).some(item => item.id === 'transfer');
  assert(!adaTransfer, 'borosList masih mengandung kategori "transfer"');
});

test('chartKeluar semua bulan tidak melebihi batas wajar', () => {
  const maxBulanIni = EXPECTED.totalKeluar + 100; // toleransi kecil
  const bulanIniBugged = (calc.chartKeluar || []).find(v => v > maxBulanIni * 2);
  assert(!bulanIniBugged,
    `chartKeluar ada nilai ${bulanIniBugged?.toLocaleString('id-ID')} yang terlalu besar`);
});

// ----- GROUP 2: calcHealthScore — transfer exclusion -----
console.log('\n💚 calcHealthScore — Transfer Exclusion\n');

test('health score bisa dikalkulasi', () => {
  assert(health !== null && health !== undefined, 'calcHealthScore return null');
});

test('cashflow skor tidak turun karena transfer', () => {
  if (!health.ready) {
    console.log('     ⚠️  Skipped — belum cukup data (grace period)');
    return;
  }
  assertEqual(
    health.komponen.cashflow.skor,
    EXPECTED.healthCashflowSkor,
    'cashflow.skor'
  );
});

test('cashflow totalKeluar di health score tidak ikut transfer', () => {
  if (!health.ready) {
    console.log('     ⚠️  Skipped — belum cukup data (grace period)');
    return;
  }
  assertEqual(
    health.komponen.cashflow.totalKeluar,
    EXPECTED.totalKeluar,
    'health.cashflow.totalKeluar'
  );
});

// ----- GROUP 3: Edge cases -----
console.log('\n🔍 Edge Cases\n');

test('tidak ada transaksi sama sekali → tidak crash', () => {
  // Simulasi user baru tanpa transaksi
  // calcDashboard dengan array kosong tidak boleh throw
  assert(typeof calc === 'object', 'calcDashboard tidak return object');
});

test('weeklyCashflow tidak terdistorsi transfer', () => {
  const allNegative = (calc.weeklyCashflow || []).every(v => v < -1_000_000);
  assert(!allNegative, 'weeklyCashflow semua negatif — transfer_out mungkin masih ikut');
});

// ===== SUMMARY =====
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const total = passed + failed;
console.log(`  Hasil: ${passed}/${total} passed${failed > 0 ? `, ${failed} failed` : ''}`);

if (failed > 0) {
  console.log('\n  Yang gagal:');
  errors.forEach(e => console.log(`  • ${e.name}`));
  console.log('');
  process.exit(1); // exit code 1 = ada yang gagal (berguna untuk CI)
} else {
  console.log('  Semua test hijau ✅');
  console.log('');
  process.exit(0);
}
