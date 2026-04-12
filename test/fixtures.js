// ===== TEST/FIXTURES.JS — Dataset dummy untuk unit test =====
// Semua nominal dalam Rupiah, tanggal dinamis (bulan ini)

function getThisMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function dateStr(day) {
  const { year, month } = getThisMonth();
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ===== WALLETS =====
const WALLETS = [
  { id: 'wallet-bca',   nama: 'BCA',   icon: '🏦', saldo_awal: 5_000_000 },
  { id: 'wallet-gopay', nama: 'GoPay', icon: '💚', saldo_awal: 500_000  },
];

// ===== TRANSAKSI =====
// Scenario:
//   - Gaji masuk 8 juta
//   - Pengeluaran murni 2.3 juta (makan, transport, belanja)
//   - Transfer 1 juta BCA → GoPay (INI YANG DULU IKUT NGITUNG)
//   - Nabung 500rb
//
// Expected totalKeluar = 2.300.000 (bukan 3.300.000)
// Expected totalMasuk  = 8.000.000
// Expected cashflow    = 5.700.000

const TRANSACTIONS = [
  // === MASUK ===
  {
    id: 'tx-001', jenis: 'masuk', nominal: 8_000_000,
    kategori: 'gaji', tanggal: dateStr(1),
    catatan: 'Gaji Januari', wallet_id: 'wallet-bca',
  },

  // === KELUAR MURNI ===
  {
    id: 'tx-002', jenis: 'keluar', nominal: 500_000,
    kategori: 'makan', tanggal: dateStr(3),
    catatan: 'Makan minggu ini', wallet_id: 'wallet-bca',
  },
  {
    id: 'tx-003', jenis: 'keluar', nominal: 300_000,
    kategori: 'transport', tanggal: dateStr(5),
    catatan: 'Bensin + tol', wallet_id: 'wallet-bca',
  },
  {
    id: 'tx-004', jenis: 'keluar', nominal: 800_000,
    kategori: 'belanja', tanggal: dateStr(7),
    catatan: 'Belanja bulanan', wallet_id: 'wallet-bca',
  },
  {
    id: 'tx-005', jenis: 'keluar', nominal: 700_000,
    kategori: 'makan', tanggal: dateStr(10),
    catatan: 'Makan minggu kedua', wallet_id: 'wallet-gopay',
  },

  // === TRANSFER ANTAR WALLET (BCA → GoPay) ===
  // INI YANG SEHARUSNYA TIDAK IKUT DIHITUNG SEBAGAI PENGELUARAN
  {
    id: 'tx-006', jenis: 'keluar', nominal: 1_000_000,
    kategori: 'transfer', tanggal: dateStr(8),
    catatan: 'Top-up GoPay', wallet_id: 'wallet-bca',
    type: 'transfer_out', group_id: 'grp-001', peer_wallet_id: 'wallet-gopay',
  },
  {
    id: 'tx-007', jenis: 'masuk', nominal: 1_000_000,
    kategori: 'transfer', tanggal: dateStr(8),
    catatan: 'Top-up GoPay', wallet_id: 'wallet-gopay',
    type: 'transfer_in', group_id: 'grp-001', peer_wallet_id: 'wallet-bca',
  },

  // === NABUNG ===
  {
    id: 'tx-008', jenis: 'nabung', nominal: 500_000,
    kategori: 'tabungan', tanggal: dateStr(15),
    catatan: 'Nabung rutin', wallet_id: 'wallet-bca',
  },

  // === BULAN LALU (untuk test prevKeluar) ===
  // prevKeluar murni seharusnya 600.000, bukan 1.100.000
  {
    id: 'tx-009', jenis: 'keluar', nominal: 600_000,
    kategori: 'makan', tanggal: (() => {
      const now = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 10);
      return prev.toISOString().split('T')[0];
    })(),
    catatan: 'Makan bulan lalu', wallet_id: 'wallet-bca',
  },
  {
    id: 'tx-010', jenis: 'keluar', nominal: 500_000,
    kategori: 'transfer', tanggal: (() => {
      const now = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      return prev.toISOString().split('T')[0];
    })(),
    catatan: 'Transfer bulan lalu', wallet_id: 'wallet-bca',
    type: 'transfer_out', group_id: 'grp-002', peer_wallet_id: 'wallet-gopay',
  },
  {
    id: 'tx-011', jenis: 'masuk', nominal: 500_000,
    kategori: 'transfer', tanggal: (() => {
      const now = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      return prev.toISOString().split('T')[0];
    })(),
    catatan: 'Transfer bulan lalu', wallet_id: 'wallet-gopay',
    type: 'transfer_in', group_id: 'grp-002', peer_wallet_id: 'wallet-bca',
  },
];

// ===== EXPECTED VALUES =====
// Angka yang HARUS dihasilkan kalkulasi setelah fix
const EXPECTED = {
  totalMasuk:   8_000_000,  // gaji saja, transfer_in tidak ikut masuk (tx-007 berjenis masuk tapi bukan income)
  totalKeluar:  2_300_000,  // tx-002+003+004+005, TANPA tx-006 (transfer_out)
  totalNabung:    500_000,
  cashflow:     5_700_000,  // 8jt - 2.3jt
  prevKeluar:     600_000,  // tx-009 saja, TANPA tx-010 (transfer_out bulan lalu)

  // Health score cashflow: keluar (2.3jt) < masuk (8jt) → skor 100
  healthCashflowSkor: 100,

  // katTotal tidak boleh ada entry 'transfer'
  katTotalNoTransfer: true,

  // rataHarian: totalKeluar / spanHari (bukan termasuk hari transfer)
  rataHarianMax: 300_000, // tidak mungkin lebih dari ini kalau transfer tidak ikut
};

module.exports = { WALLETS, TRANSACTIONS, EXPECTED, getThisMonth };
