# CatatDuit v3 — Sprint C

PWA expense tracker untuk pasar Indonesia.
Deploy: app-catatduit.vercel.app | Dijual di Shopee via Warung Digital.

---

## Struktur Folder (Sprint C — refactor)

```
catatduit/
├── index.html
├── style.css
├── sw.js                    # Service Worker
├── calc.worker.js           # Web Worker (harus di root untuk scope SW)
├── manifest.json
├── vercel.json
├── lib/
│   ├── chart.min.js
│   └── lucide.min.js
└── src/
    ├── app.js               # Boot + Onboarding
    ├── core/                # Foundation — no UI deps
    │   ├── state.js         # Constants, STORAGE_KEYS, KATEGORI_DEFAULT
    │   ├── utils.js         # Pure utils, WorkerBridge
    │   └── storage.js       # localStorage CRUD, migrations, atomic transfer
    ├── shared/              # Cross-feature UI helpers
    │   ├── ui.js
    │   ├── bottom-sheet.js
    │   ├── pwa.js
    │   └── quick-capture.js
    └── features/
        ├── dashboard/       # dashboard.js, calc, insight, chart, health-score
        ├── transfer/        # Sprint C #18 — Transfer UI
        ├── insight/         # Sprint C #19 — Rolling 2-week insight
        ├── budget/
        ├── input/
        ├── riwayat/
        ├── cerita/
        ├── goals/
        ├── tagihan/
        ├── tabungan/
        ├── settings/
        └── kategori/
```

> calc.worker.js tetap di root karena Web Worker scope relatif ke SW scope (/), bukan ke caller file.

---

## Sprint C — Fitur Baru

### #18 — Account Transfer Antar Wallet
- Tombol Transfer di greeting card (muncul kalau >= 2 wallet)
- Bottom sheet: pilih from/to, nominal, tanggal, catatan, swap button
- Live saldo hint + soft warning kalau nominal > saldo
- Atomic: satu transfer = dua entry (transfer_out + transfer_in) diikat group_id
- Delete otomatis hapus pair (deleteTransferAtomic dari B2)

### #19 — Rolling 2-Week Category Insight
- Window: 14 hari terakhir vs 14 hari sebelumnya (rolling, bukan kalender bulan)
- Severity: tipis (10%+), naik (30%+), signifikan (60%+), melonjak (120%+)
- Anomaly: deteksi kategori baru muncul atau hilang tiba-tiba
- Card "Analisis 2 Minggu" di dashboard (collapsible, priority 58)
- Summary text juga masuk Momen Insight pipeline

---

## Sprint History

| Sprint | Status |
|--------|--------|
| A — Foundation + Notif | Done |
| A2 — UI Quick Wins | Done |
| B — Analytics | Done |
| B2 — Budget & Navigation | Done |
| C — Transfer & Insights | Done |
| C2 — Cerita Flagship | Next |
