# CLAUDE.md — CatatDuit v4

> Baca file ini sebelum menyentuh satu baris kode apapun.
> Semua keputusan di sini sudah final kecuali ada instruksi eksplisit dari owner.

---

## Project Overview

**CatatDuit v4** — PWA expense tracker untuk pasar Indonesia.
Stack: React + Vite + TypeScript · Pattern: Modular Monolith (Strangler Fig rewrite dari v3)
Branch: `rewrite/v4` · Deploy target: Vercel · Schema version saat ini: **v6**

Target user: usia 18 sampai boomer, mobile-first, one-handed, zero jargon keuangan.
Bahasa UI: full Bahasa Indonesia — tidak ada i18n, tidak ada English mode.

---

## Boundary Rules (wajib dipatuhi)

```
1. STORAGE RULE
   ❌ localStorage.getItem() di luar folder storage/
   ✅ Semua akses localStorage hanya lewat src/storage/

2. FEATURE ISOLATION RULE
   ❌ features/home/ import dari features/budget/
   ✅ Fitur berkomunikasi lewat store/ atau storage/, bukan import langsung

3. TYPE RULE
   ❌ Definisi type/interface di dalam file feature
   ✅ Semua types ada di src/types/

4. COMPONENT RULE
   ❌ Komponen di features/ dipakai oleh feature lain
   ✅ Kalau dipakai >1 fitur, pindah ke src/components/

5. STYLE RULE
   ❌ style={{ }} inline di JSX (kecuali dynamic value seperti width %)
   ❌ CSS file di dalam folder feature
   ✅ Pakai CSS modules atau Tailwind utility classes
```

---

## Tech Stack & Tooling

| Layer     | Pilihan                                      | Alasan                        |
| --------- | -------------------------------------------- | ----------------------------- |
| Framework | React 18 + Vite + TypeScript                 | Standard PWA stack            |
| State     | Zustand (per-domain stores + computed store) | Lightweight, no boilerplate   |
| Routing   | React Router v6                              | Back gesture, deep link ready |
| Icons     | Lucide React                                 | Stroke-based, tree-shakeable  |
| Test      | Vitest                                       | Vite-native, fast             |
| Deploy    | Vercel                                       | SPA config via vercel.json    |

**Test scope:** Migration scripts + storage layer wajib. Komponen skip untuk sekarang.

---

## Folder Structure

```
src/
├── types/          # Semua TypeScript interfaces & types
├── constants/      # Nilai yang tidak berubah
├── storage/        # Satu-satunya layer yang boleh sentuh localStorage
│   └── migration/  # migration.v3.ts hingga migration.v6.ts
├── store/          # Global state (Zustand)
│   └── computed.store.ts  # Derived values: uang bebas, total saldo, cashflow
├── lib/            # Utility murni, no side effects
├── features/       # Satu folder per fitur (isolated)
│   ├── input/
│   ├── riwayat/
│   ├── home/
│   ├── wallet/
│   ├── transfer/
│   ├── budget/
│   ├── tagihan/
│   ├── tabungan/
│   ├── goals/
│   ├── kategori/
│   ├── insight/
│   ├── onboarding/
│   ├── settings/
│   └── quick-capture/
├── components/     # Shared UI (dipakai >1 fitur)
│   ├── ui/         # Button, Input, BottomSheet, Toast, Modal, Badge, Card, Icon, PriorityBanner, SupportCard
│   └── layout/     # BottomNav, PageLayout, FAB
├── hooks/          # Shared hooks (useToast, usePWA, useStorageSize, useUpdateAvailable)
├── styles/         # variables.css, reset.css, base.css, index.css
├── App.tsx         # Router, layout shell, migration runner, update checker
└── main.tsx
```

**Cara hapus fitur (contoh: hapus Tagihan):**

1. Hapus `src/features/tagihan/`
2. Hapus `src/storage/storage.tagihan.ts`
3. Hapus `src/types/tagihan.types.ts`
4. Hapus entry di `src/storage/index.ts`
5. Hapus route di `App.tsx`
6. Hapus tab di `BottomNav.tsx`
   Tidak ada file lain yang perlu disentuh.

---

## Information Architecture

### Navigation

```
Bottom Nav: Home · Planning · Insight · [FAB]
Header Home: [⇄ Pindah Dompet]  CatatDuit  [⚙ Pengaturan]
```

- 3 tab + FAB di ujung kanan — tidak boleh ditambah
- FAB di ujung kanan (bukan tengah — 4 elemen asimetris kalau FAB di tengah)
- Setting tidak di nav — diakses lewat header icon + label "Pengaturan"
- Pindah Dompet = shortcut ke Transfer bottom sheet, selalu tampil

### HOME

- **Priority Banner** (conditional) — di paling atas, tidak dismissible, hilang otomatis. Satu kalimat gabungan dari semua kondisi aktif (budget jebol, tagihan jatuh tempo, update tersedia). Jika tidak ada kondisi → slot kosong tanpa whitespace sisa.
- **Currency Toggle** (conditional) — hanya muncul kalau multicurrency enabled DAN secondary currency sudah di-set
- **Hero Number: Uang Bebas** — sub-label wajib: "sisa setelah tagihan & tabungan". Toggle bulanan/mingguan.
- **Support Card** (conditional, dismissible) — muncul kembali setelah 3 hari. Isi: icon ☕, judul "CatatDuit gratis selamanya", dua CTA Trakteer + Saweria. Link: `https://trakteer.id/win32_icang/gift` · `https://saweria.co/win32icang`
- **Card Keuangan** (default: expanded, collapsible) — saldo per wallet, total saldo, tagihan, nabung, uang bebas
- **Card Cashflow** — total masuk vs keluar + net
- **Card Pengeluaran per Hari** — chart batang bulan ini
- **Card Catatan Terakhir** — recent transactions + CTA "Lihat semua catatan →" + Bagikan Ringkasan

### PLANNING

Tab switcher: **Budget · Tagihan · Tabungan** (bukan "Goals")

### FAB → Input Transaksi (Bottom Sheet)

Jenis: Keluar / Masuk / Transfer
Fields: nominal, kategori, wallet, tanggal, catatan
Flag opsional "Bayar dari tabungan" — dipilih manual user, sistem tidak otomatis mendeteksi.

**Transfer — Constraint Kurs:**
- Transfer antar dompet hanya boleh dilakukan antar dompet dengan currency yang sama
- Dropdown wallet tujuan hanya menampilkan wallet dengan currency yang sama dengan wallet asal
- Jika tidak ada wallet tujuan yang valid → tampil pesan: "Tidak ada dompet lain dengan mata uang yang sama."
- Label shortcut di header: "⇄ Antar Dompet" (bukan "Pindah Dompet" yang ambigu, bukan "Transfer" yang berkonotasi m-banking)
- Fitur ini belum diimplementasi — menunggu sprint `features/input/`

### INSIGHT

Toggle di paling atas: **Bulanan** (6 bulan terakhir) · **Mingguan** (6 minggu terakhir). Semua card mengacu ke toggle ini.

Empat card, vertikal, tidak ada tab internal. Setiap card wajib ada narasi interpretatif di bawah chart — maksimal 2 paragraf, tidak boleh mengulang angka yang sudah tampil di visual, hanya interpret pola dan konsekuensinya.

- **Tren Lintas Waktu** — line chart. Dua dropdown independen (Pengeluaran / Pemasukan / Nabung). Dropdown kedua bisa di-set "tidak ada" untuk single metric. Default: Pengeluaran + Pemasukan. Metric 1 = solid line, Metric 2 = dashed line. Label nominal above dot.
- **Tren per Kategori** — bar chart. Single dropdown kategori keluar (exclude transfer_keluar dan lainnya_keluar). Bar tertinggi warna penuh, sisanya transparan. Label nominal above bar.
- **Perbandingan Periode** — bulanan: bulan ini vs bulan lalu. Mingguan: minggu ini vs minggu lalu. Hanya kategori yang eksis di kedua periode yang ditampilkan — ada footnote yang menjelaskan ini. Delta dalam nominal bukan persen ("naik 900rb bulan ini"). Dual bar per kategori dengan label bulan eksplisit.
- **Hari Paling Boros** — grid 3×2 per periode. Tiap cell: nama periode, hari terboros, nominal, bar mini relatif ke nilai tertinggi. Alert strip muncul kalau satu hari dominan ≥50% periode.

### RIWAYAT

Full page. Entry point satu-satunya: Card Catatan Terakhir → "Lihat semua catatan →". Wajib ada back button/gesture yang jelas.

---

## Update & Upgrade Flow

### Prinsip

- Update **tidak pernah otomatis** — selalu user-initiated
- User yang sedang input transaksi tidak boleh terganggu
- Boomer-safe: perubahan UI tidak boleh mengejutkan — ada notifikasi sebelum reload

### Alur Update (Service Worker)

```
SW mendeteksi versi baru (waiting event)
  → useUpdateAvailable() hook aktif
  → PriorityBanner muncul dengan copy:
     "Ada pembaruan tersedia. Ketuk untuk memperbarui."
  → User tap banner
  → skipWaiting() dipanggil
  → window.location.reload()
```

**Hook:** `src/hooks/useUpdateAvailable.ts`

- Listen ke SW `waiting` event via `navigator.serviceWorker`
- Expose `{ updateAvailable: boolean, applyUpdate: () => void }`
- `applyUpdate()` → postMessage `{ type: 'SKIP_WAITING' }` ke SW → reload

**Banner priority:** Update banner tampil di bawah kondisi kritis (budget jebol, tagihan jatuh tempo). Copy tidak boleh menakutkan — bukan "ERROR" atau "WAJIB UPDATE".

### Alur Migration (Schema)

```
App.tsx mount
  → runMigrations() dipanggil SEBELUM render apapun
  → Sukses → render normal
  → Gagal → render <MigrationErrorPage />
```

**MigrationErrorPage** harus:

- Jelaskan dengan bahasa manusia: "Terjadi masalah saat memperbarui data kamu."
- Tombol **Export Data** (download JSON mentah dari localStorage)
- Tombol **Reset Aplikasi** (hapus semua data, mulai onboarding baru) — dengan konfirmasi 2 langkah
- **Readonly mode TIDAK tersedia** — terlalu kompleks untuk edge case yang jarang terjadi. Export → Reset adalah jalan yang lebih aman dan lebih mudah dijelaskan ke user.

### vercel.json (SPA routing)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Tanpa ini, refresh di route `/riwayat` akan 404.

---

## Data Architecture

### localStorage Keys

| Constant                 | Key                              | Type                                  |
| ------------------------ | -------------------------------- | ------------------------------------- |
| `ONBOARDING`             | `cd_onboarding_done`             | `boolean`                             |
| `NAMA`                   | `cd_nama`                        | `string`                              |
| `SALDO_AWAL`             | `cd_saldo_awal`                  | `number` — Legacy, untuk migrasi saja |
| `TRANSAKSI`              | `cd_transaksi`                   | `Transaksi[]`                         |
| `KATEGORI`               | `cd_kategori`                    | `KategoriMap`                         |
| `TAGIHAN`                | `cd_tagihan`                     | `Tagihan[]`                           |
| `GOALS`                  | `cd_goals`                       | `Goal[]` — max 5                      |
| `WALLETS`                | `cd_wallets`                     | `Wallet[]`                            |
| `SCHEMA_VERSION`         | `cd_schema_v`                    | `number` — saat ini **6**             |
| `BUDGETS`                | `cd_budgets`                     | `BudgetMap`                           |
| `CURRENCY`               | `cd_currency`                    | `string`                              |
| `NUDGE`                  | `cd_nudge_shown`                 | `boolean`                             |
| `CHECKLIST_DISMISSED`    | `cd_checklist_dismissed`         | `boolean`                             |
| `BUDGET_PERIOD`          | `cd_budget_period`               | `"monthly"\|"weekly"`                 |
| `CARD_COLLAPSED`         | `cd_card_collapsed`              | `string[]`                            |
| `SUPPORT_BANNER`         | `cd_support_banner_dismissed_at` | `number` — timestamp                  |
| `SECONDARY_CURRENCY`     | `cd_secondary_currency`          | `string\|null`                        |
| `ACTIVE_CURRENCY_TOGGLE` | `cd_active_currency_toggle`      | `"base"\|"secondary"`                 |
| `MULTICURRENCY_ENABLED`  | `cd_multicurrency_enabled`       | `boolean`                             |

### Entity Schemas

**Transaksi:**

```typescript
{
  id: string
  jenis: "masuk" | "keluar" | "nabung"
  nominal: number           // max 999_000_000_000
  kategori: string          // FK ke Kategori.id
  tanggal: string           // "YYYY-MM-DD"
  catatan: string           // default ""
  wallet_id: string         // FK ke Wallet.id
  timestamp: number         // Date.now()
  // Transfer only:
  type?: "transfer_out" | "transfer_in"
  group_id?: string         // pair transfer — hapus satu harus hapus keduanya
  peer_wallet_id?: string
}
```

**Wallet:**

```typescript
{
  id: string; // default wallet = "utama"
  nama: string;
  icon: string; // emoji
  saldo_awal: number;
  currency: string; // e.g. "IDR"
}
// Saldo dikalkulasi: saldo_awal + Σ(masuk) - Σ(keluar)
```

**Tagihan:**

```typescript
{
  id: string
  nama: string
  nominal: number
  tanggal: number           // tanggal jatuh tempo dalam bulan (1–31)
  wallet_id: string
  kategori: string
  isRecurring: boolean      // default true
  paidMonths: string[]      // array "YYYY-MM", append-only
}
```

**Goal:**

```typescript
{
  id: string
  nama: string
  target: number
  terkumpul: number         // update manual, tidak relasi ke tx nabung
  deadline?: string         // "YYYY-MM-DD"
  icon?: string
}
```

**Budget (BudgetMap v6):**

```typescript
{
  [currencyCode: string]: {
    [kategoriId: string]: number
  }
}
```

### Kategori ID yang Hardcoded (jangan rename)

`transfer_keluar` · `transfer_masuk` · `lainnya_keluar` · `lainnya_masuk` · `lainnya_nabung` · `tabungan` · `investasi_nabung` · `dana_darurat`

### Konstanta

- `DEFAULT_WALLET_ID = "utama"`
- `MAX_NOMINAL = 999_000_000_000`
- `MAX_GOALS = 5`

### Migration Rules

- Setiap perubahan schema = versi baru, bump `SCHEMA_VERSION`
- Migration harus idempotent (aman dijalankan berkali-kali)
- `runMigrations()` di `App.tsx` harus dipanggil sebelum fitur apapun aktif
- Kalau migration gagal → render `<MigrationErrorPage />`, jangan crash
- History: v3 (wallet_id+timestamp) → v4 (kategori transfer) → v5 (currency di Wallet) → v6 (Budget per-currency)

---

## Design System

### Design Philosophy

"Tenang, tapi hidup." Visual reference: Notion.so — tapi lebih hangat, lebih Indonesia.

- Calm by default: whitespace adalah fitur
- Direct, not sterile: tidak ada dekorasi tanpa fungsi
- Familiar, not boring: pola dikenal, detail yang bikin senyum

### Color Tokens

**Semantic (pakai ini di komponen):**

```css
--bg-base: #f7f7f5 --bg-surface: #ffffff --bg-surface-2: #f2f2f0
  --text-primary: #1a1a1a --text-secondary: #787774 --text-tertiary: #a0a09a
  --accent: #0f7b6c --accent-hover: #0a6358 --accent-subtle: #e8f5f3
  --border-default: #e8e8e5 --border-strong: #d4d4cf --border-focus: #0f7b6c
  --status-danger: #e5484d --status-danger-bg: #fff0f0 --status-success: #30a46c
  --status-success-bg: #edfaf3 --money-out: #e5484d --money-in: #30a46c
  --money-neutral: #3d3d3a;
```

**Aturan warna:**

- Satu aksen per layar
- `--status-danger` hanya untuk error/hapus/warning — bukan dekorasi
- `--money-out` / `--money-in` hanya untuk angka transaksi
- Background selalu `--bg-base` atau `--bg-surface` — tidak ada pure white background

### Typography

```css
--font-family:
  "Inter", -apple-system,
  sans-serif Scale: 12 / 14 / 16 / 20 / 24 / 32px Weight: 400 body · 500 label ·
    600 angka penting/heading;
```

- Angka duit pakai `font-variant-numeric: tabular-nums`
- Minimum 12px — tidak ada exception
- Heading tidak perlu uppercase

### Spacing (base grid 4px)

```css
--space-1: 4px · --space-2: 8px · --space-3: 12px · --space-4: 16px
  --space-5: 20px · --space-6: 24px · --space-8: 32px · --space-12: 48px
  --page-padding-x: 16px · --card-padding: 16px · --section-gap: 24px
  --bottom-nav-height: 56px · --header-height: 52px · --fab-size: 56px;
```

### Border Radius

```css
--radius-sm: 4px · --radius-md: 8px · --radius-lg: 12px · --radius-full: 999px;
```

### Motion (functional only, no decoration)

```css
--duration-fast: 120ms · --duration-normal: 200ms · --duration-slow: 280ms;
```

Hormati `prefers-reduced-motion`.

### Icons

Semua ikon: **Lucide React**, stroke-based, stroke-width 1.5px.
Size: 24px (nav/header) · 20px (list item/card) · 16px (badge/inline)
Jangan mix dengan icon library lain. Jangan pakai filled icon.

### Component Rules

**Button:**

- Primary: bg `--accent`, text white, full-width untuk CTA utama
- Secondary: border `--border-strong`, bg transparent
- Danger: bg `--status-danger`
- Min tap target: 44px height
- Disabled: `--interactive-disabled`

**Bottom Sheet:**

- radius top: `--radius-lg` (12px)
- Handle bar di atas
- Overlay `--bg-overlay`
- Slide up `ease-out` 280ms

**Toast:**

- Posisi: bottom, di atas bottom nav
- Durasi: 2.5 detik
- Tidak ada action button di toast

**FAB:**

- Dead zone 80px di sekeliling — tidak ada elemen interaktif lain
- Tap animation: scale(0.92), 120ms

---

## Tone of Voice

Bahasa: Bahasa Indonesia · Sapaan: "kamu" (bukan "Anda", bukan "lo")

**Rules:**

- Kalimat aktif
- Angka selalu diformat: "Rp 1.200.000" bukan "1200000"
- Error = solusi, bukan tuduhan: "Nominal tidak boleh kosong" ✅ / "Kamu lupa isi nominal!" ❌
- Sukses = acknowledge, bukan drama: "Tersimpan" ✅ / "Yeay berhasil! 🎉" ❌
- Empty state = undangan: "Belum ada tagihan. Tambah biar kamu tahu kapan harus bayar." ✅
- Tidak ada jargon: "Uang bebas" bukan "discretionary income", "Tagihan" bukan "liabilities"
- Tidak ada emoji di toast/error/label — emoji hanya di empty state dan icon kategori
- Tidak ada tanda seru berlebihan, tidak ada ALL CAPS kecuali singkatan

**Copy patterns:**

```
Toast: "Tersimpan" · "Dihapus" · "Gagal menyimpan, coba lagi" · "Disalin"
Hapus konfirmasi: judul "Hapus [nama]?" · body "Data ini tidak bisa dikembalikan." · CTA "Hapus" / "Batal"
Update banner: "Ada pembaruan tersedia. Ketuk untuk memperbarui."
Migration error: "Terjadi masalah saat memperbarui data kamu."
```

---

## Keputusan yang Di-drop (tidak masuk v4)

Health score · Cerita bulan ini · Dark mode · i18n / English mode · Readonly mode saat migration gagal

---

## PWA Checklist

- `index.html` wajib `<link rel="manifest" href="/manifest.webmanifest">` — bukan `.json`. Vite PWA selalu generate `.webmanifest`.
- Icons wajib ada di `public/icon-192.png` dan `public/icon-512.png` sebelum build. Tanpa ini SW tidak bisa precache dan PWA tidak aktif.
- Test PWA harus di production URL (HTTPS, tanpa Vercel auth) — bukan localhost atau preview URL. Preview URL Vercel punya authentication by default yang bikin manifest 401.
- Setelah deploy, hard reload + clear site data sebelum cek DevTools → Application → Manifest.
- Kalau "No manifest detected" di DevTools padahal file ada — cek Console, kemungkinan 401 bukan 404.

---

## File Delivery Rules

- **Selalu kirim file via file output** — jangan paste code langsung di chat.
- Code yang di-paste di chat berisiko corrupt jadi markdown link (contoh: `[array.map](http://array.map)(...)` atau `[w.id](http://w.id)`) yang tidak ketahuan saat build tapi crash di runtime sebagai `TypeError: boolean is not iterable`.
- Kalau terpaksa paste di chat (snippet pendek), penerima wajib double-check baris yang mengandung `.map`, `.filter`, `.reduce`, `.find` — semua method array rawan corrupt.

---

## Checklist Sebelum Add/Edit/Remove Fitur

- [ ] Apakah fitur ini membaca/menulis localStorage key yang sudah ada?
- [ ] Jika field baru: apakah user lama yang tidak punya field ini akan crash? Tambahkan default/migration.
- [ ] Jika rename field/key: tambahkan migration baru, bump `SCHEMA_VERSION`.
- [ ] Jika hapus fitur: apakah datanya masih dipakai fitur lain? Cek tabel Lineage di `catatduit-data-architecture.md`.
- [ ] Apakah export CSV masih valid? Field baru perlu masuk ke header CSV?
- [ ] Apakah import CSV bisa membaca data lama dengan benar?
- [ ] Apakah ada test untuk migration baru di `src/storage/migration/`?

---

## Component Inventory

> Jangan buat komponen baru sebelum cek daftar ini.

### `src/components/ui/`

**`PriorityBanner`** — Banner notifikasi di atas halaman. Tidak dismissible.
Props: `message: string`, `onClick?: () => void`, `variant?: 'update' | 'warning'`

**`ChecklistCard`** — Card checklist post-onboarding. Self-contained, tidak ada props.
Item IDs: `catat_pertama` · `tambah_dompet` · `tambah_tagihan` · `buat_target`

### `src/components/layout/`

**`PageLayout`** — Shell utama. Render PriorityBanner, `<Outlet />`, BottomNav, InputBottomSheet, TransferBottomSheet.
Satu-satunya tempat sheet global di-render — jangan render InputBottomSheet/TransferBottomSheet di tempat lain.

**`BottomNav`** — 3 tab (Home / Planning / Insight) + FAB. Tidak boleh ditambah tab.

**`FAB`** — Trigger `useInputStore.open('keluar')`. Tap animation via inline style (bukan CSS).

---

## Store Registry

> Derived value → taruh di `computed.store.ts`, bukan store baru.

**`useInputStore`** — `src/store/input.store.ts`
State: `isOpen`, `initialJenis`. Actions: `open(jenis?)`, `close()`

**`useTransferStore`** — `src/store/transfer.store.ts`
State: `isOpen`. Actions: `open()`, `close()`

**`useTransaksiStore`** — `src/store/transaksi.store.ts`
State: `transaksi[]`. Actions: `hydrate()`, `add()`, `addPair()`, `update()`, `remove()`

**`useWalletStore`** — `src/store/wallet.store.ts`
State: `wallets[]`, `activeWalletId`. Actions: `hydrate()`, `setActiveWallet()`, `save()`

**`useComputed`** — `src/store/computed.store.ts` — custom hook (bukan Zustand).
Returns: `ComputedKeuangan` — `{ totalSaldo, totalMasuk, totalKeluar, totalTagihan, totalNabung, uangBebas }`
Helper export: `getRelevantWalletIds(wallets)`

---

## Code Rules

```
6. SIZE RULE
   ❌ File komponen > 200 baris
   ❌ File store / storage > 100 baris
   ✅ Split ke subkomponen atau custom hook kalau melebihi batas
   Catatan: HomePage, PlanningPage, InsightPage sudah melanggar — jangan tambah baris,
   targetkan refactor saat sprint terkait.

7. PATTERN RULE
   ❌ useEffect untuk derived state — pakai useMemo
   ❌ Nested ternary lebih dari 1 level
   ❌ Prop drilling lebih dari 2 level — angkat ke store
   ❌ Inline style kecuali dynamic value (width %, transform)
   ✅ Early return untuk guard condition
   ✅ Named function di JSX event handler

8. IMPORT RULE
   ❌ Import storage function langsung di komponen — lewat store
   ✅ Komponen hanya boleh import dari: store/, components/, hooks/, lib/, types/, constants/
   Pengecualian: fitur settings boleh import storage langsung
```

---

## Sprint State

> Update tiap sprint selesai.

### ✅ DONE — jangan tulis ulang

| File | Status |
|------|--------|
| `src/storage/storage.base.ts` | Final. |
| `src/storage/storage.transaksi.ts` | Final. |
| `src/storage/storage.wallet.ts` | Final. |
| `src/storage/storage.tagihan.ts` | Final. |
| `src/storage/storage.goals.ts` | Final. Backward compat `terkumpul ?? 0`. |
| `src/storage/storage.budget.ts` | Final. |
| `src/storage/storage.kategori.ts` | Final. |
| `src/storage/storage.settings.ts` | Done. Tambah `saveActiveCurrencyToggle`. |
| `src/storage/migration/` (v3–v6) | Final. Jangan ubah. |
| `src/storage/migration/migration.v7.ts` | Done. Default `currency` ke baseCurrency untuk goal lama. |
| `src/store/input.store.ts` | Final. |
| `src/store/transfer.store.ts` | Final. |
| `src/store/transaksi.store.ts` | Final. |
| `src/store/wallet.store.ts` | Final. |
| `src/store/computed.store.ts` | Final. |
| `src/hooks/useToast.ts` | Final. |
| `src/hooks/useUpdateAvailable.ts` | Final. |
| `src/lib/format.ts` | Final. `formatRupiah(n, currencySymbol?)` support optional symbol. |
| `src/components/ui/PriorityBanner.tsx` | Final. |
| `src/components/ui/ChecklistCard.tsx` | Final. |
| `src/components/layout/BottomNav.tsx` | Final. |
| `src/components/layout/FAB.tsx` | Final. |
| `src/components/layout/PageLayout.tsx` | Final. |
| `src/components/MigrationErrorPage.tsx` | Final. |
| `src/features/settings/SettingsPage.tsx` | Done. Full redesign. |
| `src/features/home/HomePage.tsx` | Done sprint ini. Currency toggle C-style, activeCurrency tidak bergantung multicurrencyEnabled. |
| `src/features/home/HomePage.module.css` | Done sprint ini. CSS toggle option C. |
| `src/features/insight/InsightPage.tsx` | Done sprint ini. Filter wallet by currency aktif. |
| `src/features/budget/PlanningPage.tsx` | Done sprint ini. Form goal + currency picker. |
| `public/` (PWA icons + manifest) | Done. SW aktif di production. |

### ⚠️ BELUM MASUK KE CODEBASE — apply manual

| File | Yang perlu dilakukan |
|------|---------------------|
| ~~`src/types/index.ts`~~ | ✅ Done — `currency: string` sudah ada di Goal |
| ~~`src/constants/index.ts`~~ | ✅ Done — `CURRENT_SCHEMA_VERSION = 7` |
| ~~`src/storage/migration/runner.ts`~~ | ✅ Done — migrateV7 sudah terdaftar |
| ~~`src/features/input/InputBottomSheet.tsx`~~ | ✅ Done — sudah pakai semua wallet |

### 🚧 WIP / PERLU REFACTOR

| File | Catatan |
|------|---------|
| `src/features/home/HomePage.tsx` | 1158+ baris — split sprint berikutnya. |
| `src/features/budget/PlanningPage.tsx` | 1049+ baris — split sprint berikutnya. |
| `src/features/insight/InsightPage.tsx` | 938+ baris — split sprint berikutnya. |

### ❌ BELUM ADA

| Yang belum ada | Catatan |
|----------------|---------|
| `src/hooks/usePWA.ts` | Disebutkan tapi belum exist. |
| `src/hooks/useStorageSize.ts` | Disebutkan tapi belum exist. |
| Transfer constraint kurs | `TransferBottomSheet.tsx` ada tapi constraint kurs belum diimplementasi. |
