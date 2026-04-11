# 💰 CatatDuit

**Catat pengeluaran, kenali keuanganmu.**

Aplikasi pencatat keuangan pribadi yang simpel, privat, dan bisa dipakai offline — dibangun khusus untuk pengguna Indonesia.

🔗 **Live demo:** [app-catatduit.vercel.app](https://app-catatduit.vercel.app)

---

## ✨ Fitur

- 📊 **Dashboard lengkap** — Estimasi saldo, cashflow bulanan, uang bebas setelah kewajiban
- 💸 **3 jenis transaksi** — Uang masuk, keluar, dan nabung
- 👛 **Multi-wallet** — Pantau BCA, GoPay, DANA, Cash, dan lainnya sekaligus
- 🎯 **Goals nabung** — Buat target dan pantau progressnya
- 📋 **Reminder tagihan** — Catat cicilan & subscription agar tidak lupa
- 📈 **Tren & grafik** — Pola pengeluaran 12 bulan terakhir
- 🧠 **Financial Health Score** — Skor kesehatan keuangan berdasarkan data nyata
- ⚡ **Quick Capture** — Catat transaksi dalam 2 detik
- 📤 **Export & import CSV** — Backup data kapan saja
- 🔒 **100% privat** — Semua data tersimpan di perangkat kamu, tidak ada server

---

## 🛠 Tech Stack

- **Vanilla JavaScript** — tanpa framework, tanpa build step
- **localStorage only** — tidak ada backend, tidak ada database
- **PWA** — bisa di-install di homescreen, jalan offline
- Chart.js · Lucide Icons · Inter Font

---

## 🚀 Cara Pakai

1. Buka [app-catatduit.vercel.app](https://app-catatduit.vercel.app) di browser HP
2. Isi nama dan pilih dompet yang mau dipantau
3. Mulai catat — tidak perlu login, tidak perlu daftar

Bisa di-install sebagai PWA (Add to Home Screen) agar terasa seperti app native.

---

## 💻 Run Locally

Tidak ada build step. Clone dan buka langsung:

```bash
git clone https://github.com/chandragumelar/catatduit.git
cd catatduit
npx serve .
```

---

## 🔐 Privasi

- Data **tidak pernah keluar dari perangkat kamu**
- Tidak ada server, tidak ada database, tidak ada akun
- Tidak ada iklan, tidak ada tracking
- Kode berjalan sepenuhnya di browser

> ⚠️ Karena data disimpan di browser localStorage, **hapus cache = data hilang**. Gunakan fitur Export Data secara berkala sebagai backup.

---

## 📁 Struktur Project

```
catatduit/
├── index.html          # Entry point
├── style.css           # Global styles
├── sw.js               # Service Worker (PWA + offline)
├── manifest.json       # PWA manifest
├── js/
│   ├── app.js          # Boot + onboarding flow
│   ├── state.js        # Global state & constants
│   ├── storage.js      # localStorage helpers
│   ├── ui.js           # Shared UI utilities
│   ├── utils.js        # Pure helper functions
│   ├── dashboard.js    # Dashboard screen
│   ├── dashboard.calc.js
│   ├── dashboard.chart.js
│   ├── dashboard.insight.js
│   ├── input.js        # Transaksi input form
│   ├── quick-capture.js
│   ├── riwayat.js      # Transaction history
│   ├── budget.js       # Budget per kategori
│   ├── health-score.js # Financial Health Score
│   ├── cerita.js       # Cerita Bulan Ini
│   ├── goals.js        # Savings goals
│   ├── tagihan.js      # Bill reminders
│   ├── tabungan.js     # Savings tracker
│   ├── kategori.js     # Category management
│   ├── settings.js     # Settings screen
│   ├── bottom-sheet.js # Bottom sheet component
│   └── pwa.js          # PWA install prompt
└── chart.min.js        # Chart.js (local)
```

---

*Dibuat dengan ❤️ oleh [@chandragumelar](https://github.com/chandragumelar) — solo build, vanilla JS, untuk pengguna Indonesia.*
