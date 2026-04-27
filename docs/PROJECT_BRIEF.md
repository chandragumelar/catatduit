# PROJECT_BRIEF.md — CatatDuit v3

> Pocket data analyst pribadi untuk orang Indonesia kelas menengah bawah-menengah.
> Versi ini adalah fondasi produk: offline-first, privacy-first, AI-ready.

---

## 1. VISION

Bukan sekadar tracker pengeluaran.
CatatDuit adalah "asisten keuangan lokal" yang paham konteks hidup orang Indonesia —
gaji UMR, kirim uang kampung, cicilan motor, ojek harian, jajan gorengan.

User tidak perlu ngerti istilah finance. User hanya perlu jujur mencatat,
dan CatatDuit yang akan kasih tahu artinya.

---

## 2. PROBLEM STATEMENT

| # | Masalah |
|---|---------|
| 1 | User takut data keuangannya dibaca dan direkam oleh server |
| 2 | Aplikasi keuangan pakai istilah yang tidak dimengerti (debit, kredit, net worth, dll) |
| 3 | Aplikasi hanya mencatat, tidak memberi insight yang actionable |
| 4 | User tidak tahu gunanya mencatat — tidak ada feedback loop yang berarti |

---

## 3. TARGET USERS & PERSONAS

**Segmen:** Gen Z dan Millennial Indonesia, kelas menengah bawah-menengah.

| Persona | Deskripsi |
|---------|-----------|
| **Mahasiswa** | Belum gajian, uang dari orang tua/beasiswa, pengeluaran tidak terprediksi |
| **Freelancer** | Penghasilan tidak tetap, perlu tahu "bulan ini aman atau tidak" |
| **Karyawan kantoran** | Gaji bulanan, punya cicilan, butuh tahu kemana uangnya pergi |

**Bahasa UI:** Indonesia. Tidak ada versi bahasa Inggris.

---

## 4. GOALS & SUCCESS METRICS

| Goal | Metric | Target Awal |
|------|--------|-------------|
| Akuisisi user baru | Jumlah first-time user (device baru buka app) | 500 di bulan pertama |
| Retensi | Jumlah user yang kembali dalam 7 hari | >30% |
| Monetisasi awal | Jumlah donasi via Trakteer / Saweria | Ada di bulan ke-2 |

> Analytics: Plausible atau Umami (next update). V1 tidak ada tracking.

---

## 5. SCOPE V1

### 5.1 Core Principle
- **Offline-first, localStorage only** — tidak ada data yang keluar dari device user tanpa consent eksplisit
- **Privacy by design** — tidak ada server yang menyimpan data keuangan
- **Opsi cloud sync** — user bisa pilih login via email (Supabase Auth) untuk backup/sync. Default: tidak login

### 5.2 Multi-Currency (Filter, Bukan Konversi)
- Setiap dompet punya 1 currency yang di-set saat dibuat dan tidak bisa diubah
- Currency yang didukung: **IDR dan USD**
- Di seluruh app ada **currency filter**: user pilih mau lihat data dompet IDR atau USD
- Ketika filter aktif di IDR: semua tampilan (saldo, cashflow, insight, budget) hanya menghitung dompet ber-currency IDR
- Ketika filter aktif di USD: hanya dompet ber-currency USD yang dihitung
- **Tidak ada konversi antar currency**
- **Tidak ada pencampuran IDR + USD dalam satu tampilan agregat**

### 5.3 Fitur — Onboarding & Auth
- Intro highlight / slider (first open only)
- Onboarding flow: setup dompet pertama + currency, kategori awal
- Nudge checklist (panduan langkah pertama)
- Login opsional via email/password (Supabase Auth)
- Kalau login: data bisa di-sync ke Supabase. Kalau tidak login: 100% localStorage

### 5.4 Fitur — Home Page
- Greeting card (nama + konteks waktu)
- Currency filter pill (IDR / USD) — mempengaruhi semua card finansial
- Support card (link Trakteer / Saweria)
- Notification card
- Keuangan kamu card (total saldo dompet sesuai currency aktif)
- Cashflow bulan ini card (pemasukan vs pengeluaran)
- Aktivitas harian card (list transaksi hari ini)
- Budget bulan ini card (progress vs limit)
- Target menabung card
- Catatan terakhir card
- Ringkasan bulan ini card

### 5.5 Fitur — Perencanaan Page

**Tab: Budget**
- Toggle periode: **Mingguan / Bulanan**
- User set budget per kategori untuk periode yang dipilih
- Tampilan progress menyesuaikan toggle aktif

**Tab: Tagihan**
- Dua tipe tagihan: **Recurring** (otomatis muncul tiap periode) dan **Non-recurring** (sekali bayar)
- Tagihan recurring: frekuensi mingguan / bulanan / tahunan
- Pengingat jatuh tempo via push notification

**Tab: Tabungan**
- Target tabungan: nama, nominal tujuan, deadline
- Progress tracker per target

### 5.6 Fitur — Insight Page
- **Toggle periode: Mingguan / Bulanan** — mempengaruhi semua card
- Tren lintas waktu card
- Tren per kategori card
- Perbandingan periode card (minggu/bulan ini vs sebelumnya)
- Hari paling boros card

### 5.7 Fitur — Pengaturan Page
- Profil card (nama, avatar)
- Dompet group list: **add, edit, remove** — nama, icon, currency (IDR/USD), saldo awal
- Kategori group list: **add, edit, remove** — nama, icon, tipe (pengeluaran/pemasukan)
- Data card: export data, hapus semua data
- FAQ card
- Support card (Trakteer / Saweria)
- Developer profile

### 5.8 Input Transaksi (FAB)
- FAB button dua aksi: **Keluar** (pengeluaran) dan **Masuk / Nabung** (pemasukan / transfer ke tabungan)
- Form transaksi: nominal, dompet, kategori, catatan, tanggal

### 5.9 In-App Feedback
- Form feedback singkat: rating + komentar opsional
- Muncul sebagai nudge setelah beberapa transaksi pertama (tidak paksa)

### 5.10 Push Notification
- Web Push API + Service Worker (no cost, native PWA)
- Use case: pengingat mencatat harian, alert budget hampir habis, pengingat jatuh tempo tagihan

---

## 6. OUT OF SCOPE V1

- Versi bahasa Inggris
- Anonymous analytics (next update — Plausible/Umami)
- Local AI / auto-kategorisasi (next update — Transformers.js)
- Konversi antar currency (IDR ↔ USD)
- Lebih dari 2 currency
- Enkripsi teknis data localStorage
- Import dari rekening bank / e-wallet otomatis

---

## 7. NEXT UPDATE (V2 PREVIEW)

### 7.1 Analytics
Pasang Plausible atau Umami (self-hosted, privacy-first).
Ukur traction tanpa login: page views, fitur yang dipakai, retensi by device.

### 7.2 Local AI — Auto Kategorisasi
- Library: **Transformers.js** (run di browser, no server cost)
- Model kandidat: Phi-3 mini, Gemma 2B, atau Qwen 2.5 kecil
- Use case pertama: auto-generate kategori dari deskripsi transaksi yang diketik user
- Contoh: user ketik "gojek ke kantor" → sistem suggest kategori "Transportasi"
- Potensi berikutnya: insight natural language ("bulan ini kamu paling boros di...")

> **Implikasi untuk V1:** Struktur data transaksi harus AI-ready sejak awal.
> Lihat DATA_ARCHITECTURE.md untuk detail schema.

---

## 8. NON-FUNCTIONAL REQUIREMENTS

| Aspek | Requirement |
|-------|-------------|
| **Privacy** | Data keuangan tidak keluar device kecuali user aktif pilih cloud sync |
| **Security** | Supabase Auth untuk login (JWT). RLS aktif jika cloud sync dipakai |
| **Performance** | First load <3s di koneksi 4G Indonesia |
| **Mobile** | Responsive mobile-first + installable PWA |
| **Offline** | Full functionality tanpa koneksi internet |
| **Compliance** | GDPR-compliant: user bisa export dan hapus semua datanya |

---

## 9. TECH STACK

| Layer | Pilihan | Alasan |
|-------|---------|--------|
| Frontend | **Svelte + Vite** | Compile to vanilla JS, bundle kecil, performa baik di HP low-end, cocok PWA |
| Storage | localStorage (default) + Supabase (opsional) | Offline-first, cloud sync opsional |
| Auth | Supabase Auth | Free tier 50.000 MAU, JWT, mudah diintegrasikan |
| Push Notif | Web Push API + VAPID keys | No cost, native browser |
| Hosting | Vercel | Free tier cukup untuk early stage |
| AI (V2) | Transformers.js | Client-side, no server cost |

> Greenfield total — tidak ada migrasi dari codebase lama.

---

## 10. CONSTRAINTS

- Solo developer — scope harus realistis, tidak overengineer
- Zero operational cost di V1 (Supabase free tier, Vercel free tier)
- Target device: mid-low Android (RAM 3–4GB, koneksi 4G)
- Bahasa UI: Indonesia saja

---

## 11. LAUNCH PLAN

- Platform: Product Hunt, Reddit (r/indonesia, r/PersonalFinanceIndonesia), komunitas Indonesia (Discord, Telegram)
- Differentiator yang dikomunikasikan: *"Data kamu 100% di HP kamu. Bukan di server kami."*
- Monetisasi: Donasi sukarela via Trakteer / Saweria — bukan subscription, bukan iklan

---

*Dokumen ini approved sebagai dasar untuk INFORMATION_ARCHITECTURE.md, DESIGN_SYSTEM.md, TECHNICAL_DESIGN.md, dan DATA_ARCHITECTURE.md.*
