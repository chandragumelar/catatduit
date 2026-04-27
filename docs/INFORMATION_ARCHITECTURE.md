# INFORMATION_ARCHITECTURE.md — CatatDuit v3

> Draft v2. Belum final — menunggu review dan revisi.

---

## 1. GLOBAL STATE (Mempengaruhi Seluruh App)

| State | Nilai | Default | Scope Pengaruh |
|-------|-------|---------|----------------|
| `activeCurrency` | currency code (e.g. `IDR`, `USD`, `AUD`) | currency dompet pertama | Semua data finansial (saldo, cashflow, budget, insight) |
| `activePeriodType` | `weekly` / `monthly` | `monthly` | Insight page, Budget tab |
| `authState` | `guest` / `logged_in` | `guest` | Profil card |

**Aturan currency:**
- User bebas pilih currency dari daftar currency umum saat buat dompet
- Maksimal **2 currency berbeda** di seluruh app (contoh: IDR + USD, atau IDR + AUD)
- Maksimal **10 dompet** total
- Satu dompet = satu currency, fixed setelah dibuat
- Distribusi bebas: boleh 5 dompet IDR semua, atau 2 IDR + 4 USD, dll
- Tidak ada konversi antar currency — currency filter memisahkan tampilan data

---

## 2. STRUKTUR NAVIGASI

```
App
├── Onboarding (first open only)
│   ├── Intro Slider (3 slide)
│   ├── Isi Nama Panggilan
│   ├── Setup Dompet (add / remove, nama manual)
│   ├── Set Nominal Saldo per Dompet
│   └── Submit → Beranda + Nudge Checklist muncul
│
├── Main App
│   ├── Bottom Navigation (4 item)
│   │   ├── 🏠 Beranda
│   │   ├── 📋 Perencanaan
│   │   ├── 💡 Insight
│   │   └── ➕ FAB Catat (paling kanan)
│   │
│   └── Ikon Pengaturan — pojok kanan atas Beranda (bukan bottom nav)
│
└── Sheet / Modal (overlay)
    ├── Form Transaksi Keluar
    ├── Form Transaksi Masuk
    ├── Form Transaksi Nabung
    ├── Detail Transaksi
    ├── Form Tambah / Edit Dompet       ← hanya dari Pengaturan
    ├── Form Tambah / Edit Kategori     ← hanya dari Pengaturan
    ├── Form Tambah / Edit Budget
    ├── Form Tambah / Edit Tagihan
    ├── Form Tambah / Edit Target Tabungan
    └── In-App Feedback
```

---

## 3. ONBOARDING FLOW

Hanya muncul saat pertama kali buka app. Setelah selesai, tidak muncul lagi.

```
[Splash / App Load]
        ↓
[Cek: sudah onboarding?]
    ├── Ya → Beranda
    └── Tidak ↓

[Intro Slider — 3 slide]
  Slide 1: "Data kamu, di HP kamu" — privacy pitch
  Slide 2: "Catat dalam detik" — simplicity pitch
  Slide 3: "Pahami uangmu" — insight pitch
        ↓
[Isi nama panggilan]
  - Input: nama panggilan (required)
        ↓
[Setup Dompet]
  - Add dompet: nama (manual), pilih currency dari daftar currency umum
  - Remove dompet (kalau sudah tambah lebih dari 1)
  - Minimal 1 dompet sebelum bisa lanjut
  - Validasi: max 2 currency berbeda, max 10 dompet
        ↓
[Set Nominal Saldo]
  - Per dompet yang sudah dibuat: input saldo awal
  - Simbol currency menyesuaikan currency dompet
  - Boleh diisi 0 / dikosongkan
        ↓
[Submit → Beranda]
  - Nudge Checklist muncul di Beranda
```

---

## 4. NUDGE CHECKLIST

Muncul di Beranda setelah onboarding selesai. Dismiss otomatis kalau semua item selesai.

| # | Item | Selesai ketika |
|---|------|----------------|
| 1 | ✅ Dompet pertama dibuat | Selesai saat onboarding |
| 2 | ⬜ Catat transaksi pertama | User simpan 1 transaksi (keluar/masuk/nabung) |
| 3 | ⬜ Tambah tagihan | User simpan 1 tagihan |
| 4 | ⬜ Tambah goal tabungan | User simpan 1 target tabungan |

---

## 5. BERANDA

### 5.1 Layout (scroll vertikal, urutan dari atas)

```
┌─────────────────────────────────────┐
│ [Ikon Pengaturan — pojok kanan atas]│
│ Greeting Card                       │
│ "Selamat pagi, [nama] 👋"           │
├─────────────────────────────────────┤
│ Currency Filter Pill                │  (di bawah greeting, bukan sejajar)
│ [ IDR ]  [ USD ]                    │  hanya tampil jika user punya 2 currency
├─────────────────────────────────────┤
│ Notification Card                   │  hanya muncul jika ada notif tagihan aktif
├─────────────────────────────────────┤
│ Keuangan Kamu Card                  │  total saldo dompet (currency aktif)
│                                     │  + list dompet mini
├─────────────────────────────────────┤
│ Cashflow Bulan Ini Card             │  pemasukan vs pengeluaran
├─────────────────────────────────────┤
│ Aktivitas Harian Card               │  list transaksi hari ini
│                                     │  tap → Detail Transaksi (sheet)
├─────────────────────────────────────┤
│ Budget Bulan Ini Card               │  progress per kategori terbesar
│                                     │  tap → Perencanaan > Tab Budget
├─────────────────────────────────────┤
│ Target Menabung Card                │  list nama target + nominal
│                                     │  tap → Perencanaan > Tab Tabungan
├─────────────────────────────────────┤
│ Catatan Terakhir Card               │  3 transaksi terakhir lintas hari
├─────────────────────────────────────┤
│ Ringkasan Bulan Ini Card            │  teks ringkas perbandingan bulan lalu
├─────────────────────────────────────┤
│ Support Card                        │  → Trakteer / Saweria
└─────────────────────────────────────┘
```

### 5.2 Behavior
- Currency filter pill hanya muncul kalau user punya dompet dengan 2 currency berbeda
- Kalau semua dompet currency sama → tidak perlu filter, langsung tampil semua
- Memilih currency di filter pill memperbarui `activeCurrency` global
- Notification card hanya muncul jika ada tagihan: H-1 jatuh tempo, hari H, atau H+1 jatuh tempo yang belum dibayar

---

## 6. PERENCANAAN PAGE

### 6.1 Tab

```
[ Budget ] [ Tagihan ] [ Tabungan ]
```

---

### 6.2 Tab: Budget

```
Toggle Periode: [ Mingguan ] [ Bulanan ]
        ↓
List budget per kategori
  Setiap item:
  - Nama kategori + icon
  - Progress bar (terpakai / limit)
  - Nominal terpakai vs limit
  - Status: aman / hampir habis / over

Tombol: + Tambah Budget → Form Budget (sheet)
```

**Behavior:**
- Toggle memperbarui `activePeriodType`
- Empty state: "Belum ada budget. Yuk set biar pengeluaran lebih terkontrol" + CTA

---

### 6.3 Tab: Tagihan

```
Section: Jatuh Tempo Dekat (7 hari ke depan)
  - List tagihan dengan badge "X hari lagi" / "Hari ini" / "Terlambat"

Section: Semua Tagihan
  Sub-section: Recurring
    - Nama, nominal + simbol currency, frekuensi, tanggal berikutnya, status
  Sub-section: Non-recurring
    - Nama, nominal + simbol currency, tanggal jatuh tempo, status

Tombol: + Tambah Tagihan → Form Tagihan (sheet)
```

**Behavior:**
- Tap tagihan → Form Edit Tagihan (sheet)
- Swipe / long press → opsi: Tandai Lunas, Edit, Hapus
- Tagihan recurring yang sudah lewat otomatis generate instance periode berikutnya
- Empty state: "Tidak ada tagihan. Tambahkan tagihan rutin biar tidak lupa bayar"

---

### 6.4 Tab: Tabungan

```
List target tabungan aktif
  Setiap item:
  - Nama target
  - Nominal target
  - Tombol hapus

Tombol: + Tambah Target → Form Target Tabungan (sheet)
```

**Behavior:**
- Tap target → Form Edit Target Tabungan (sheet)
- Empty state: "Belum ada goal tabungan. Mulai rencanakan sesuatu yang kamu inginkan"

---

## 7. INSIGHT PAGE

### 7.1 Struktur

```
Toggle Periode: [ Mingguan ] [ Bulanan ]
(Currency mengikuti activeCurrency global)
        ↓
Cards (scroll vertikal):
  1. Tren Lintas Waktu
  2. Tren Per Kategori
  3. Perbandingan Periode
  4. Hari Paling Boros
```

### 7.2 Detail Card

**Tren Lintas Waktu**
- Line chart: pengeluaran per hari (mingguan) atau per minggu (bulanan)
- Titik tertinggi di-highlight

**Tren Per Kategori**
- Bar chart horizontal atau donut chart
- Urutan: terbesar ke terkecil

**Perbandingan Periode**
- Periode ini vs sebelumnya: pengeluaran, pemasukan, selisih
- Label: "Lebih hemat X%" atau "Lebih boros X%"

**Hari Paling Boros**
- Nama hari + nominal + breakdown kategori

### 7.3 Behavior
- Toggle periode memperbarui `activePeriodType` global
- Semua card re-render mengikuti toggle dan `activeCurrency`
- Empty state: "Catat pengeluaran atau pemasukanmu untuk lihat tren"

---

## 8. PENGATURAN PAGE

Diakses via ikon pojok kanan atas Beranda.

### 8.1 Layout (scroll vertikal)

```
┌─────────────────────────────────────┐
│ Profil Card                         │
│ Nama panggilan, status: Guest/email │
│ CTA: Login / Logout                 │
├─────────────────────────────────────┤
│ Dompet Group List                   │
│ List dompet: nama, currency, saldo  │
│ Tap → Form Edit Dompet (sheet)      │
│ Tombol: + Tambah Dompet             │
│ Per item: tombol Hapus              │
│ Validasi hapus: min 1 dompet        │
├─────────────────────────────────────┤
│ Kategori Group List                 │
│ Tab: Pengeluaran / Pemasukan        │
│ List kategori per tipe              │
│ Tap → Form Edit Kategori (sheet)    │
│ Tombol: + Tambah Kategori           │
│ Per item: tombol Hapus              │
│ Catatan: default kategori tidak     │
│ bisa dihapus                        │
├─────────────────────────────────────┤
│ Notifikasi Card                     │
│ Toggle aktifkan push notification   │
│ Setting: jam pengingat harian       │
├─────────────────────────────────────┤
│ Data Card                           │
│ Export CSV                          │
│ Reset aplikasi (konfirmasi 2 langkah│
│ — hapus semua data + kembali ke     │
│ onboarding)                         │
├─────────────────────────────────────┤
│ FAQ Card                            │
│ Accordion Q&A                       │
├─────────────────────────────────────┤
│ Support Card                        │
│ Link Trakteer / Saweria             │
├─────────────────────────────────────┤
│ Developer Profile                   │
│ Nama, link, versi app               │
└─────────────────────────────────────┘
```

---

## 9. FAB — CATAT TRANSAKSI

FAB di posisi paling kanan bottom navigation. Tap expand jadi 3 pilihan.

```
Tap FAB
    ↓
Expand 3 pilihan:
  ├── 💸 Keluar  → Form Transaksi Keluar (sheet)
  ├── 💰 Masuk   → Form Transaksi Masuk (sheet)
  └── 🐷 Nabung  → Form Transaksi Nabung (sheet)
```

### 9.1 Form Transaksi Keluar

```
1. Pilih Dompet (required) → menentukan currency
2. Nominal (required) — simbol currency mengikuti dompet dipilih
3. Kategori (required)
4. Catatan (opsional — input ini dipakai AI v2 untuk auto-kategorisasi)
5. Tanggal (default: hari ini)

Aksi: Simpan / Batal
```

### 9.2 Form Transaksi Masuk

```
1. Pilih Dompet (required) → menentukan currency
2. Nominal (required) — simbol currency mengikuti dompet dipilih
3. Kategori (required)
4. Catatan (opsional)
5. Tanggal (default: hari ini)

Aksi: Simpan / Batal
```

### 9.3 Form Transaksi Nabung

```
1. Pilih Dompet sumber (required) → menentukan currency
2. Nominal (required) — simbol currency mengikuti dompet dipilih
3. Catatan (opsional)
4. Tanggal (default: hari ini)

Aksi: Simpan / Batal
```

---

## 10. SHEET INVENTORY

| Sheet | Trigger | Field Utama |
|-------|---------|-------------|
| Form Transaksi Keluar | FAB → Keluar | Dompet, nominal, kategori, catatan, tanggal |
| Form Transaksi Masuk | FAB → Masuk | Dompet, nominal, kategori, catatan, tanggal |
| Form Transaksi Nabung | FAB → Nabung | Dompet sumber, nominal, catatan, tanggal |
| Detail Transaksi | Tap transaksi | Info lengkap + edit / hapus |
| Form Dompet | Pengaturan → + Tambah / tap dompet | Nama, currency, saldo awal |
| Form Kategori | Pengaturan → + Tambah / tap kategori | Nama, icon, tipe |
| Form Budget | + Tambah Budget / tap budget | Kategori, nominal limit, periode |
| Form Tagihan | + Tambah Tagihan / tap tagihan | Nama, nominal, tipe, frekuensi, tanggal |
| Form Target Tabungan | + Tambah Target / tap target | Nama, nominal tujuan |
| In-App Feedback | Auto-nudge setelah beberapa transaksi | Rating bintang + komentar opsional |

---

## 11. AUTH FLOW

```
[Pengaturan → Profil Card]
  Status: Guest
  CTA: "Login untuk backup data"
        ↓
[Sheet: Login / Daftar]
  Tab: Masuk | Daftar
  Field: Email + Password (Supabase Auth)
        ↓
[Berhasil]
  Status profil: menampilkan email
  Data lokal tetap di localStorage
  Tidak ada auto-sync
```

---

## 12. PUSH NOTIFICATION FLOW

```
[Pengaturan → Notifikasi Card]
  Toggle: Aktifkan Notifikasi
        ↓
[Browser permission prompt]
  Izinkan / Tolak
        ↓
[Jika diizinkan]
  - Setting jam pengingat harian (default: 21:00)
  - Notif aktif: pengingat harian, alert budget hampir habis
  - Notif tagihan: H-1, hari H, H+1 jatuh tempo (jika belum dibayar)
```

---

## 13. EMPTY STATES

| Lokasi | Pesan |
|--------|-------|
| Beranda — belum ada transaksi hari ini | "Belum ada catatan hari ini" |
| Budget — belum ada budget | "Belum ada budget. Yuk set biar pengeluaran lebih terkontrol" |
| Tagihan — belum ada tagihan | "Tidak ada tagihan. Tambahkan tagihan rutin biar tidak lupa bayar" |
| Tabungan — belum ada target | "Belum ada goal tabungan. Mulai rencanakan sesuatu yang kamu inginkan" |
| Insight — belum ada data | "Catat pengeluaran atau pemasukanmu untuk lihat tren" |

---

## 14. NAVIGATION RULES

- Bottom nav: 3 item + FAB di paling kanan → `Beranda | Perencanaan | Insight | FAB`
- Ikon Pengaturan di pojok kanan atas Beranda — bukan bagian bottom nav
- FAB expand in-place, tidak membuka halaman baru
- Semua tambah/edit via sheet — tidak ada halaman tersendiri kecuali onboarding
- Back dari sheet → tutup sheet, tetap di halaman yang sama
- Deep link tidak diperlukan di V1

---

*Draft v2 — menunggu review. Setelah approved, lanjut ke DESIGN_SYSTEM.md.*
