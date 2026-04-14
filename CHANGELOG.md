# Changelog

Semua perubahan signifikan per rev/sprint dicatat di sini.
Format: `## [revN] — tanggal` dengan subsections Fixed / Added / Changed / Removed.

---

## [rev20] — 2026-04-12

### Added
- `README.md` — rewrite lengkap: project overview, architecture diagram, file map, dev/test/deploy instructions
- `CONVENTIONS.md` — panduan naming, state management, DOM manipulation, error handling, utils extraction
- `CHANGELOG.md` — file ini
- `src/core/debug.js` — DEV-only debug panel overlay (no-op di production; aktif via `cd_debug=1`)
- `package.json` scripts: `dev`, `lint`, `test`, `test:watch`

### Changed
- `eslint.config.mjs` — tambah rules: `no-unused-vars: error`, `no-console: warn`, `consistent-return: error`, `eqeqeq: error`, `no-var: error`
- Semua file JS di `src/` dan `calc.worker.js` — header distandarisasi ke format `// === FILE.JS === Tanggung jawab / Depends on`
- `index.html` script block — tambah section comments (CORE / SHARED UI / FEATURES / BOOT)

---

## [rev19] — Sprint C (final)

### Fixed
- Bug: onboarding currency selector menulis ke key yang salah (`CURRENCY_SYMBOL` → `CURRENCY`)

### Removed
- Dead code: `calcDashboardAsync` (tidak pernah dipanggil)
- Dead code: `_calcBudgetStatus`, `_calcHealthScore` di `calc.worker.js`
- Dead code: `_calcStreak` duplikat di `dashboard.insight.js` dan `cerita.data.js`
- Dead file: `src/app.js.bak`

---

## [rev18] — Sprint C

### Added
- Feature #19: Rolling 2-Week Category Insight (`insight.rolling.js`)
  - Window 14 hari vs 14 hari sebelumnya
  - Severity: tipis (10%+), naik (30%+), signifikan (60%+), melonjak (120%+)
  - Anomaly: kategori baru muncul atau hilang tiba-tiba
  - Card "Analisis 2 Minggu" di dashboard (collapsible, priority 58)

---

## [rev17] — Sprint C

### Added
- Feature #18: Account Transfer Antar Wallet (`transfer.js`)
  - Tombol Transfer di greeting card (muncul kalau ≥ 2 wallet)
  - Bottom sheet: pilih from/to, nominal, tanggal, catatan, swap button
  - Live saldo hint + soft warning kalau nominal > saldo
  - Atomic: satu transfer = dua entry (transfer_out + transfer_in) diikat `group_id`
  - Delete otomatis hapus pair via `deleteTransferAtomic`

---

## [rev16] — Sprint C2 (Cerita Flagship)

### Added
- Cerita Bulan Ini: Spotify Wrapped-style monthly recap
  - 9 slide sequence (`cerita.slides.js`, `cerita.slides.render.js`, `cerita.slides.render2.js`)
  - 9 financial personas (`cerita.persona.js`)
  - Share card SVG generator (`cerita.share.svg.js`)
  - Share text + share flow (`cerita.sharetext.js`, `cerita.share.js`)
  - Dedicated CSS (`cerita.css`)

---

## [rev15] — Sprint B2

### Added
- Budget per kategori (`budget.js`)
- `deleteTransferAtomic` di `storage.js` — hapus pair transfer sekaligus
- Schema migration v4 → v5

### Changed
- Navigation: tambah Planning tab (Tabungan & Tagihan)

---

## [rev14] — Sprint B

### Added
- Financial Health Score 0–100 (`health-score.js`)
- Momen Insight engine 8 rules (`dashboard.insight.js`)
- Chart spending per kategori (`dashboard.chart.js`)
- Dashboard cards refactor (`dashboard.cards.js`)

---

## [rev13] — Sprint A2

### Added
- Quick Capture floating button (`quick-capture.js`)
- Bottom sheet generic component (`bottom-sheet.js`)
- Rolling insight data structure groundwork

---

## [rev12] — Sprint A (Foundation)

### Added
- Multi-wallet support: `getWallets`, `saveWallets`, `getSaldoWallet`
- Schema migration system (`migrateSchema`)
- PWA: Service Worker, install prompt, push notification (`pwa.js`, `sw.js`)
- Onboarding flow conversational (`app.js`)
- Kategori custom per jenis (`kategori.js`)
- Tagihan recurring tracker (`tagihan.js`)
- Tabungan goals tracker (`tabungan.js`)
- Riwayat with filter bulan + jenis + search (`riwayat.js`)
- Settings: wallet management, currency, data export (`settings.js`)

## v3.2 — Tagihan filter by currency toggle

### Bug Fix: Count tagihan & banner notifikasi tidak difilter by currency toggle
**Root cause:** `dashboard.calc.js` — `tagihanBulanIni`, `tagihanBelumBayar`, `tagihanSudahBayar` dideklarasi sebelum filter currency, sehingga jumlah tagihan dan nama tagihan di banner mencakup semua currency.

**Fix:** `src/features/dashboard/dashboard.calc.js`
- Rename `tagihanBulanIni` → `tagihanBulanIniRaw` (semua tagihan, unfiltered)
- Tambah intermediate `tagihanBelumBayarAll` dan `tagihanSudahBayarAll` dari raw
- Deklarasi ulang `tagihanBulanIni`, `tagihanBelumBayar`, `tagihanSudahBayar` **setelah** filter `activeCurCode`
- Hapus `tagihanBelumBayarActive` (sudah tidak diperlukan, merge ke `tagihanBelumBayar`)

**Efek:** Semua consumer downstream (`dashboard.js` → banner notifikasi, `dashboard.cards.keuangan.js` → teks status tagihan) otomatis terfilter tanpa perlu diubah.

**File yang diubah:**
- `src/features/dashboard/dashboard.calc.js` ✅
