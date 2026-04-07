# CatatDuit v3 — Context Document
> Bawa file ini ke setiap new chat. Ini pengganti PRD sekaligus briefing lengkap untuk AI assistant.

---

## 🧠 Tentang Produk

**CatatDuit** adalah PWA (Progressive Web App) expense tracker untuk pasar Indonesia.
- Bahasa: Indonesia
- Platform: Web App (PWA) — bukan native, bukan desktop
- Distribusi: Shopee (nama toko: Warung Digital)
- Model bisnis: **Jual lepas, one-time purchase, no subscription**
- Versi live: **v3.0.0** — https://app-catatduit.vercel.app/
- Stack: Vanilla JS, localStorage only, no backend, no server

---

## 🏛️ Prinsip Utama — TIDAK BOLEH DILANGGAR

1. **Dari kalkulator jadi financial companion**
   Setiap keputusan fitur dan desain harus ditanya: *apakah ini cuma nampilin angka, atau genuinely membantu user?*

2. **App pertama yang bikin user ngerti keuangan mereka sendiri — bukan cuma lihat angka**
   Bukan edukasi keuangan. Bukan ceramah. Insight yang personal, relevan, dari data mereka sendiri.

3. **User merasa diperhatikan tanpa merasa diintip**
   Semua insight dan personalisasi harus terasa hangat — bukan surveillance.

---

## 🔒 Hal yang TIDAK AKAN PERNAH ADA

- Login / akun user
- Server / backend
- Cloud sync
- Data keluar dari device user
- Iklan
- Email user

---

## 📁 Struktur Codebase v3 (current)

```
catatduit/
├── index.html
├── style.css
├── chart.min.js
├── lucide.min.js
├── manifest.json          ← PWA shortcut "Catat Cepat" (?q=1)
├── sw.js                  ← Service worker robust, cache-first
├── vercel.json            ← SPA routing + SW header
├── keygen.py              ← license key generator
└── js/
    ├── state.js           ← constants, STORAGE_KEYS, WALLET_PRESETS, mutable state
    ├── utils.js           ← pure utility functions (unchanged dari v2)
    ├── storage.js         ← localStorage + wallet layer + budget + migration
    ├── license.js         ← license key validation + boot setelah aktivasi
    ├── ui.js              ← toast, modal, navigation
    ├── app.js             ← boot + onboarding v3 (3 step: nama → wallet → saldo)
    ├── bottom-sheet.js    ← reusable _openBottomSheet()
    ├── pwa.js             ← install prompt, update banner, notifikasi tagihan
    ├── health-score.js    ← Financial Health Score (4 komponen @ 25%)
    ├── budget.js          ← budget per kategori + dashboard section
    ├── quick-capture.js   ← quick input <10 detik, long-press FAB atau ?q=1
    ├── cerita.js          ← "Cerita Bulan Ini" — Spotify Wrapped for finance
    ├── dashboard.calc.js  ← semua kalkulasi dashboard
    ├── dashboard.insight.js ← momen insight engine, 8 rules, 2 wording/rule
    ├── dashboard.chart.js ← chart rendering + share summary
    ├── dashboard.js       ← orchestrator, render HTML saja
    ├── input.js           ← catat transaksi + wallet picker
    ├── riwayat.js         ← transaction history (unchanged dari v2)
    ├── goals.js           ← tab tabungan & goals
    ├── tagihan.js         ← tab tagihan
    ├── tabungan.js        ← orchestrator tab tabungan/tagihan
    ├── settings.js        ← settings + wallet management + notif opt-in
    └── kategori.js        ← kelola kategori (unchanged dari v2)
```

---

## 🗄️ Data Model v3

```javascript
// Transaksi
{
  id, jenis,          // 'keluar' | 'masuk' | 'nabung'
  nominal, kategori,
  tanggal,            // 'YYYY-MM-DD'
  catatan,
  wallet_id,          // default: 'utama'
  timestamp,          // ms — untuk pattern analysis granular
}

// Wallet
{
  id, nama,           // 'BCA', 'GoPay', dll
  icon,               // emoji
  saldo_awal,
}

// Budget — object { [kategoriId]: nominalLimit }
// Goals  — { id, nama, target }
// Tagihan — { id, nama, nominal, jatuhTempo, isRecurring, paidMonths }
// Kategori — { keluar: [...], masuk: [...], nabung: [...] }
```

### Storage Keys v3
```javascript
STORAGE_KEYS = {
  ONBOARDING, NAMA, SALDO_AWAL,   // SALDO_AWAL = legacy compat
  TRANSAKSI, KATEGORI, TAGIHAN, GOALS, LICENSE,
  WALLETS,        // v3 — array wallet
  SCHEMA_VERSION, // v3 — migration guard, current = 3
  BUDGETS,        // v3 — budget per kategori
}
```

### Migration Rule
Semua transaksi lama otomatis dapat `wallet_id: 'utama'` dan `timestamp` via `migrateToV3()` — idempotent, dipanggil setiap boot.

---

## ✨ Fitur v3 — Status

| Fitur | Status |
|---|---|
| Multi-Wallet (onboarding + input + settings) | ✅ Done |
| Financial Health Score | ✅ Done |
| Momen Insight Engine (8 rules) | ✅ Done |
| Budget per Kategori | ✅ Done |
| Quick Capture (<10 detik) | ✅ Done |
| Conversational Onboarding (3 step) | ✅ Done |
| Cerita Bulan Ini (Wrapped-style) | ✅ Done |
| PWA: install prompt, update banner | ✅ Done |
| PWA: push notifikasi tagihan (opt-in) | ✅ Done |
| PWA: service worker robust | ✅ Done |

---

## 🚧 Pending / Backlog

- **Wallet summary "Uang bebas"** — tambah baris total saldo - nabung bulan ini di wallet summary card (dashboard, single wallet case). Menunggu sign-off UI/UX.
- **Health Score warmup copy** — "Catat 1 hari lagi..." perlu penjelasan singkat apa itu health score dan kenapa user mau nunggu sampai besok.
- **iOS notification copy** — catatan di Settings bahwa notifikasi hanya di Android/desktop, dan cara workaround di iOS (Add to Home Screen dulu).
- **Storage indicator** — dihapus dari Settings karena lebih bikin anxiety daripada berguna. LocalStorage ~5MB cukup untuk 25.000+ transaksi (13 tahun @ 5 tx/hari). Tidak perlu dikerjakan.

---

## 🎨 Cerita Bulan Ini — Detail

9 persona keuangan, match berdasarkan data user:

| Persona | Kondisi |
|---|---|
| 🐜 Si Semut | Nabung ≥ 20% pemasukan |
| 🎯 Si Hemat | Pengeluaran turun ≥ 20% dari bulan lalu |
| 🍜 Si Foodie | Kategori terboros = makan |
| 🛵 Si Nomaden | Kategori terboros = transport |
| 💪 Si Pejuang | Cashflow negatif |
| 📓 Si Rajin | Konsistensi catat ≥ 80% |
| ☁️ Si Santuy | Cashflow positif tapi tidak nabung |
| ⚖️ Si Seimbang | Tidak ada kategori dominan (< 40%) |
| 📱 Si Pencatat | Fallback |

- Threshold: 5 transaksi minimum untuk persona muncul
- Entry point: card teal di dashboard (muncul otomatis setelah ≥ 5 tx)
- Filter: dropdown bulan + tahun (hanya bulan yang ada datanya)
- Badge: "Final" vs "Sampai hari ini"
- Output: fullscreen sheet + print/PDF via `window.print()`

---

## 📝 Copy System

### Prinsip
- Bahasa Indonesia, relatable, tidak terlalu formal
- Tone: seperti teman yang peduli — bukan app keuangan yang kaku
- **Setiap action sentence harus punya 2 versi wording — rotate per session**
- Paragraf insight selalu pakai minimal 1 angka dari data user

### Tone Examples
✅ *"Boleh perkiraan dulu."*
✅ *"Tidak apa-apa. Mulai lagi dari sekarang."*
✅ *"Di HP kamu sendiri."*
❌ *"Masukkan semua akun keuangan kamu."*
❌ *"Data 100% aman tersimpan di localStorage browser."*

---

## 💰 Pricing & Bisnis

- Channel: **Shopee — Warung Digital**
- Model: one-time purchase
- Selling points utama:
  1. Quick Capture — catat dalam 10 detik
  2. Multi-wallet — pantau semua dompet sekaligus
  3. Financial Health Score — tau kondisi keuangan dalam satu angka
  4. Cerita Bulan Ini — recap keuangan yang personal dan shareable
  5. Privacy-first — data tidak pernah keluar dari HP kamu

---

## ⚙️ Technical Standards

- **Error handling:** Try-catch di setiap render function — tidak boleh ada kondisi app blank
- **Satu file = satu tanggung jawab** — tidak ada file >430 baris
- **Cache invalidation:** `invalidateTransaksiCache()` defensif, tidak manual
- **Schema future-proof:** Data model support longitudinal insight tanpa migrasi besar
- **Vercel deploy:** `vercel.json` wajib ada untuk SPA routing + SW header no-cache

---

*Dokumen ini adalah sumber kebenaran tunggal untuk CatatDuit v3.*
*Setiap keputusan yang bertentangan dengan prinsip utama harus didiskusikan dulu sebelum dieksekusi.*
