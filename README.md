# CatatDuit v4

I built CatatDuit because most expense apps are either too complex or require you to trust a server with your financial data. This one does not. It's a PWA — vanilla JS, no framework, no backend — that works offline and keeps everything on your device.

**Live:** [app-catatduit.vercel.app](https://app-catatduit.vercel.app)

---

## Architecture

### Boot Flow

```
index.html loads scripts (ordered)
    │
    ├─► src/core/state.js      — constants, STORAGE_KEYS, state object
    ├─► src/core/utils.js      — pure utils, WorkerBridge
    ├─► src/core/storage.js    — localStorage CRUD + schema migrations
    ├─► src/core/debug.js      — DEV-only debug panel (no-op in prod)
    │
    ├─► src/shared/ui.js       — toast, modal, nav, icons
    ├─► src/shared/*.js        — bottom-sheet, pwa, quick-capture
    │
    ├─► src/features/**/*.js   — feature modules (self-contained)
    │
    └─► src/app.js             — DOMContentLoaded → migrateSchema() → boot()
```

### Data Flow

```
User action
    │
    ▼
Feature JS (e.g. input.js)
    │  calls
    ▼
storage.js (getTransaksi / saveTransaksi / getWallets)
    │  reads/writes
    ▼
localStorage
    │
    └─► on save: feature calls renderDashboard() / relevant render fn
```

### Heavy Calculations (Web Worker)

Expensive aggregations (monthly totals, health score) run in `calc.worker.js` via `WorkerBridge` (defined in `utils.js`). The worker lives at root so its scope matches the Service Worker scope (`/`).

---

## File Map

```
catatduit/
├── index.html              Entry point — all script tags, page HTML shells
├── style.css               All styles (single file, no preprocessor)
├── sw.js                   Service Worker — offline cache, push notifications
├── calc.worker.js          Web Worker — heavy calc (health score, monthly agg)
├── manifest.json           PWA manifest
├── vercel.json             Vercel routing config (SPA fallback)
├── package.json            Dev scripts + ESLint dep
├── eslint.config.mjs       ESLint rules
│
├── lib/
│   ├── chart.min.js        Chart.js (vendored, no CDN)
│   └── lucide.min.js       Lucide icons (vendored)
│
├── test/
│   ├── run.js              Test runner (Node, no framework)
│   └── fixtures.js         Shared test data
│
└── src/
    ├── app.js              Boot sequence + conversational onboarding flow
    │
    ├── core/               Foundation layer — zero UI dependencies
    │   ├── state.js        Global state object, STORAGE_KEYS, KATEGORI_DEFAULT
    │   ├── utils.js        Pure helpers: generateId, formatRupiah, WorkerBridge
    │   ├── storage.js      localStorage CRUD, schema migrations, wallet ops
    │   └── debug.js        DEV panel (active only when cd_debug=1 in localStorage)
    │
    ├── shared/             Cross-feature UI primitives
    │   ├── ui.js           Toast, modal confirm, page navigation, lucide init
    │   ├── bottom-sheet.js Generic bottom sheet component
    │   ├── pwa.js          Install prompt, push notification permission
    │   └── quick-capture.js Floating quick-entry shortcut
    │
    └── features/           One folder per product feature
        ├── dashboard/
        │   ├── dashboard.js            Page orchestrator
        │   ├── dashboard.calc.js       Per-month aggregation (calls WorkerBridge)
        │   ├── dashboard.cards.js      Card renderers (saldo, summary)
        │   ├── dashboard.chart.js      Chart.js wrapper
        │   ├── dashboard.insight.js    Momen Insight engine (8 rules)
        │   └── health-score.js         Financial Health Score (0–100)
        ├── input/
        │   └── input.js               Add/edit transaction form
        ├── riwayat/
        │   └── riwayat.js             Transaction history + filters
        ├── budget/
        │   └── budget.js              Monthly budget per category
        ├── transfer/
        │   └── transfer.js            Atomic wallet-to-wallet transfer
        ├── insight/
        │   └── insight.rolling.js     Rolling 2-week category comparison
        ├── tagihan/
        │   └── tagihan.js             Recurring bills tracker
        ├── tabungan/
        │   └── tabungan.js            Savings goals tracker
        ├── goals/
        │   └── goals.js               Financial goals
        ├── settings/
        │   └── settings.js            App settings, wallet management, export
        ├── kategori/
        │   └── kategori.js            Custom category management
        └── cerita/
            ├── cerita.js              Cerita Bulan Ini orchestrator
            ├── cerita.data.js         Monthly data aggregation for cerita
            ├── cerita.persona.js      9 financial personas logic
            ├── cerita.slides.js       Slide sequence controller
            ├── cerita.slides.render.js  Slide renderers (slides 1–5)
            ├── cerita.slides.render2.js Slide renderers (slides 6–9)
            ├── cerita.share.js        Share flow controller
            ├── cerita.share.svg.js    SVG share card generator
            ├── cerita.sharetext.js    Share text generator
            └── cerita.css             Cerita-specific styles
```

---

## How to Run Locally

```bash
npm run dev
# Opens at http://localhost:3000
```

Requires Node.js. Uses `npx serve` — no build step.

---

## How to Run Tests

```bash
npm test
# or watch mode:
npm run test:watch
```

Tests run in Node via `test/run.js`. No external test framework.

---

## How to Deploy

```bash
# Push to main branch — Vercel auto-deploys via GitHub integration.
# Manual deploy:
npx vercel --prod
```

`vercel.json` routes all paths to `index.html` (SPA fallback).

---

## Key Conventions

See [`CONVENTIONS.md`](./CONVENTIONS.md) for naming rules, state management patterns, and code standards.

---

## Debug Panel (DEV)

To open the debug overlay in any browser:

```js
localStorage.setItem('cd_debug', '1'); location.reload();
```

To disable: `localStorage.removeItem('cd_debug'); location.reload()`
