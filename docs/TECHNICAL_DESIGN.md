# TECHNICAL_DESIGN.md — CatatDuit v3

> Dokumen ini mendefinisikan keputusan arsitektur teknis, stack, struktur folder,
> pattern yang dipakai, dan constraint implementasi.
> Semua keputusan di sini adalah final kecuali ada RFC (request for change) eksplisit.

---

## 1. TECH STACK

| Layer | Pilihan | Versi | Alasan |
|-------|---------|-------|--------|
| UI Framework | **React** | 18.x | Ekosistem besar, contributor-friendly, familiar |
| Build Tool | **Vite** | 5.x | Fast HMR, bundle optimal, PWA plugin tersedia |
| Language | **TypeScript** | 5.x | Type safety, lebih mudah di-maintain contributor baru |
| State Management | **Zustand** | 4.x | Minimal boilerplate, mudah dibaca, no provider hell |
| Routing | **React Router** | 6.x | Standard de facto React, nested routes untuk tab |
| Styling | **CSS Modules + CSS Variables** | — | Token dari DESIGN_SYSTEM.md, no runtime CSS-in-JS |
| Storage (local) | **localStorage** via abstraction layer | — | Offline-first, semua device support |
| Storage (cloud) | **Supabase** | JS SDK v2 | Auth + optional sync, free tier 50k MAU |
| Icons | **Phosphor Icons React** | 2.x | Konsisten dengan design system |
| Charts | **Recharts** | 2.x | React-native, composable, lightweight |
| PWA | **vite-plugin-pwa** | — | Service worker + manifest auto-generate |
| Push Notif | **Web Push API** (native) | — | No cost, no third party |
| AI — V2 | **Transformers.js** | 3.x | Client-side inference, no server cost |
| Testing | **Vitest + React Testing Library** | — | Vite-native, fast, familiar API |
| Linting | **ESLint + Prettier** | — | Konsistensi kode untuk open source |

---

## 2. STRUKTUR FOLDER

```
catatduit/
├── public/
│   ├── icons/                  # PWA icons (berbagai ukuran)
│   ├── manifest.webmanifest
│   └── sw.js                   # Service worker entry (di-generate vite-plugin-pwa)
│
├── src/
│   ├── main.tsx                # Entry point
│   ├── App.tsx                 # Root component, router setup
│   │
│   ├── core/                   # Shared foundation — tidak boleh import dari features/
│   │   ├── clock/
│   │   │   ├── Clock.ts        # Interface Clock
│   │   │   ├── RealClock.ts
│   │   │   └── TestClock.ts
│   │   ├── constants/
│   │   │   ├── currencies.ts   # Daftar currency yang didukung
│   │   │   ├── categories.ts   # Default kategori
│   │   │   └── storage-keys.ts # Semua localStorage key
│   │   ├── errors/
│   │   │   └── AppError.ts
│   │   ├── storage/
│   │   │   ├── LocalStorage.ts # Abstraction layer localStorage
│   │   │   └── StorageAdapter.ts # Interface — dipakai juga untuk Supabase sync
│   │   └── utils/
│   │       ├── currency.ts     # Format angka sesuai currency
│   │       ├── date.ts         # Format tanggal, kalkulasi periode
│   │       └── validation.ts   # Shared validation helpers
│   │
│   ├── features/               # Feature-based structure
│   │   ├── onboarding/
│   │   │   ├── OnboardingPage.tsx
│   │   │   ├── IntroSlider.tsx
│   │   │   ├── SetupWallet.tsx
│   │   │   ├── SetupBalance.tsx
│   │   │   ├── useOnboarding.ts
│   │   │   └── onboarding.store.ts
│   │   │
│   │   ├── home/
│   │   │   ├── HomePage.tsx
│   │   │   ├── cards/
│   │   │   │   ├── GreetingCard.tsx
│   │   │   │   ├── CurrencyFilterPill.tsx
│   │   │   │   ├── NotificationCard.tsx
│   │   │   │   ├── NetWorthCard.tsx
│   │   │   │   ├── CashflowCard.tsx
│   │   │   │   ├── DailyActivityCard.tsx
│   │   │   │   ├── BudgetSummaryCard.tsx
│   │   │   │   ├── SavingsCard.tsx
│   │   │   │   ├── RecentTransactionsCard.tsx
│   │   │   │   ├── MonthlySummaryCard.tsx
│   │   │   │   └── SupportCard.tsx
│   │   │   └── useHome.ts
│   │   │
│   │   ├── transaction/
│   │   │   ├── TransactionSheet.tsx      # Container sheet
│   │   │   ├── ExpenseForm.tsx
│   │   │   ├── IncomeForm.tsx
│   │   │   ├── SavingsForm.tsx
│   │   │   ├── TransactionDetail.tsx
│   │   │   ├── useTransactionForm.ts
│   │   │   ├── transaction.store.ts
│   │   │   └── transaction.types.ts
│   │   │
│   │   ├── planning/
│   │   │   ├── PlanningPage.tsx
│   │   │   ├── budget/
│   │   │   │   ├── BudgetTab.tsx
│   │   │   │   ├── BudgetForm.tsx
│   │   │   │   ├── useBudget.ts
│   │   │   │   └── budget.store.ts
│   │   │   ├── bills/
│   │   │   │   ├── BillsTab.tsx
│   │   │   │   ├── BillForm.tsx
│   │   │   │   ├── useBills.ts
│   │   │   │   └── bills.store.ts
│   │   │   └── savings/
│   │   │       ├── SavingsTab.tsx
│   │   │       ├── SavingsGoalForm.tsx
│   │   │       ├── useSavingsGoals.ts
│   │   │       └── savings.store.ts
│   │   │
│   │   ├── insight/
│   │   │   ├── InsightPage.tsx
│   │   │   ├── cards/
│   │   │   │   ├── TrendOverTimeCard.tsx
│   │   │   │   ├── CategoryTrendCard.tsx
│   │   │   │   ├── PeriodComparisonCard.tsx
│   │   │   │   └── MostExpensiveDayCard.tsx
│   │   │   ├── useInsight.ts
│   │   │   └── insight.store.ts
│   │   │
│   │   └── settings/
│   │       ├── SettingsPage.tsx
│   │       ├── ProfileCard.tsx
│   │       ├── WalletSettings.tsx
│   │       ├── CategorySettings.tsx
│   │       ├── NotificationSettings.tsx
│   │       ├── DataCard.tsx
│   │       ├── FaqCard.tsx
│   │       ├── SupportCard.tsx
│   │       ├── DeveloperCard.tsx
│   │       ├── WalletForm.tsx
│   │       ├── CategoryForm.tsx
│   │       └── useSettings.ts
│   │
│   ├── stores/                 # Global stores (lintas feature)
│   │   ├── ui.store.ts         # activeCurrency, activePeriodType, sheet state
│   │   ├── auth.store.ts       # authState, user session
│   │   └── nudge.store.ts      # nudge checklist state
│   │
│   ├── components/             # Shared UI components (bukan feature-specific)
│   │   ├── BottomSheet/
│   │   │   ├── BottomSheet.tsx
│   │   │   └── BottomSheet.module.css
│   │   ├── BottomNav/
│   │   │   ├── BottomNav.tsx
│   │   │   └── BottomNav.module.css
│   │   ├── FAB/
│   │   │   ├── FAB.tsx
│   │   │   └── FAB.module.css
│   │   ├── SegmentedControl/
│   │   ├── ProgressBar/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── Card/
│   │   ├── Button/
│   │   ├── Input/
│   │   └── Dropdown/
│   │
│   ├── hooks/                  # Shared custom hooks
│   │   ├── useLocalStorage.ts
│   │   ├── useClock.ts
│   │   └── usePushNotification.ts
│   │
│   └── styles/
│       ├── tokens.css          # Semua CSS custom properties dari DESIGN_SYSTEM.md
│       ├── reset.css
│       └── global.css
│
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 3. ARSITEKTUR DATA FLOW

```
User Action
    ↓
React Component (presentational)
    ↓
Custom Hook (useFeature.ts) — logic, validation
    ↓
Zustand Store (feature.store.ts) — state update
    ↓
Storage Adapter
    ├── LocalStorage (default, offline)
    └── Supabase (jika user login dan opt-in sync)
    ↓
Store re-render → Component update
```

**Aturan:**
- Component tidak boleh akses storage langsung — harus lewat hook
- Hook tidak boleh akses Zustand store dari feature lain langsung — lewat global stores
- Store tidak boleh punya business logic — hanya state + setter
- Business logic ada di hook (useFeature.ts)

---

## 4. STORAGE LAYER

### 4.1 Abstraction

Semua akses localStorage melalui `StorageAdapter` interface.
Ini yang memungkinkan V2 switch ke Supabase tanpa ubah logic di atas.

```typescript
// core/storage/StorageAdapter.ts
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

### 4.2 localStorage Keys

Semua key didefinisikan di `core/constants/storage-keys.ts` — tidak ada magic string.

```typescript
export const STORAGE_KEYS = {
  WALLETS: 'cd_wallets',
  TRANSACTIONS: 'cd_transactions',
  BUDGETS: 'cd_budgets',
  BILLS: 'cd_bills',
  SAVINGS_GOALS: 'cd_savings_goals',
  CATEGORIES: 'cd_categories',
  USER_PROFILE: 'cd_user_profile',
  ONBOARDING_DONE: 'cd_onboarding_done',
  NUDGE_STATE: 'cd_nudge_state',
  ACTIVE_CURRENCY: 'cd_active_currency',
  PUSH_NOTIF_ENABLED: 'cd_push_notif_enabled',
  PUSH_NOTIF_TIME: 'cd_push_notif_time',
} as const;
```

### 4.3 Supabase Sync (Opsional)

- Sync hanya aktif jika user login DAN eksplisit enable di Data Card
- Sync bersifat **replace** (bukan merge) — localStorage selalu source of truth
- Conflict resolution: last-write-wins, timestamp dari `updated_at`
- Supabase hanya dipakai untuk: Auth + backup storage. Bukan realtime

---

## 5. CLOCK / TIME PROVIDER

Semua logic yang berhubungan waktu wajib inject `Clock`.

```typescript
// core/clock/Clock.ts
export interface Clock {
  now(): Date;
}

// core/clock/RealClock.ts
export class RealClock implements Clock {
  now(): Date { return new Date(); }
}

// core/clock/TestClock.ts
export class TestClock implements Clock {
  constructor(private fixedDate: Date) {}
  now(): Date { return this.fixedDate; }
  advance(ms: number): void {
    this.fixedDate = new Date(this.fixedDate.getTime() + ms);
  }
}
```

Clock di-inject via React Context di `App.tsx`:

```typescript
const ClockContext = createContext<Clock>(new RealClock());
export const useClock = () => useContext(ClockContext);
```

Di test, wrap component dengan `ClockContext.Provider value={new TestClock(...)}`.

---

## 6. MULTI-CURRENCY

- Currency disimpan per dompet, tidak bisa diubah setelah dibuat
- Daftar currency dari `core/constants/currencies.ts` — berisi code, symbol, nama
- Max 2 currency berbeda di seluruh app — divalidasi saat user tambah dompet
- Format angka menggunakan `Intl.NumberFormat` dengan locale `id-ID` untuk IDR, default untuk lainnya
- `activeCurrency` di `ui.store.ts` — filter global, bukan konversi

```typescript
// core/utils/currency.ts
export function formatAmount(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
  }).format(amount);
}
```

---

## 7. PWA & OFFLINE

### 7.1 Service Worker

Dihandle oleh `vite-plugin-pwa` dengan strategi:
- **App shell**: cache-first (HTML, CSS, JS)
- **Assets**: cache-first (fonts, icons, ilustrasi)
- **API Supabase**: network-first, fallback ke cache kalau offline

### 7.2 Web Manifest

```json
{
  "name": "CatatDuit",
  "short_name": "CatatDuit",
  "theme_color": "#0F1117",
  "background_color": "#0F1117",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/"
}
```

### 7.3 Installability

- `display: standalone` — tidak ada browser UI saat diinstall
- Icon set: 192x192 dan 512x512 (maskable)
- Prompt install muncul setelah user interaksi ke-3 (tidak langsung saat buka)

---

## 8. PUSH NOTIFICATION

```typescript
// hooks/usePushNotification.ts
// 1. Request permission
// 2. Generate subscription via PushManager
// 3. Simpan subscription ke localStorage
// 4. Trigger notif via Service Worker self.registration.showNotification()
```

**Use case yang di-handle:**
- Pengingat harian (jam dikonfigurasi user, default 21:00) — via Service Worker scheduled check
- Alert budget hampir habis (>80%) — triggered saat transaksi disimpan
- Tagihan H-1, hari H, H+1 belum dibayar — via Service Worker daily check

**Catatan:** Push notif tanpa server menggunakan **local notification** via Service Worker — bukan server push. Artinya notif hanya muncul kalau browser/PWA pernah dibuka di device itu. Ini acceptable untuk V1.

---

## 9. AI-READINESS (V2 PREPARATION)

Struktur data transaksi harus AI-ready sejak V1.

**Yang disiapkan di V1:**
- Field `notes` di setiap transaksi — teks bebas dari user, ini input utama AI
- Field `aiCategory` (nullable) di transaksi — akan diisi AI V2, kosong di V1
- Field `categoryConfidence` (nullable, 0-1) — confidence score dari AI
- Data transaksi disimpan flat dan queryable — bukan nested blob

**Yang tidak diimplementasi di V1:**
- Load Transformers.js model
- Inference pipeline
- Auto-kategorisasi UI

---

## 10. UX CONSTRAINTS (WAJIB)

### 10.1 Bottom Navigation — Tidak Boleh Discroll

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}
```

Konten halaman wajib punya `padding-bottom` minimal 64px + safe area agar tidak tertutup nav.

### 10.2 Bottom Sheet — Exit Harus Smooth

Dua cara exit yang wajib diimplementasi:

**a. Tap overlay:**
```typescript
// Tap di luar sheet area → tutup sheet
// Overlay harus full-screen dengan z-index di bawah sheet
```

**b. Swipe down:**
```typescript
// Gunakan touch events: onTouchStart, onTouchMove, onTouchEnd
// Threshold velocity: jika swipe down > 200px atau velocity > 0.5px/ms → tutup
// Saat drag: sheet follow finger (transform translateY)
// Jika tidak sampai threshold → snap back ke posisi semula
// Animasi close: 250ms ease-out
```

Tidak boleh pakai library berat untuk ini — implementasi native touch events cukup.

---

## 11. ERROR HANDLING

```typescript
// core/errors/AppError.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Error codes
export const ERROR_CODES = {
  STORAGE_READ_FAILED: 'STORAGE_READ_FAILED',
  STORAGE_WRITE_FAILED: 'STORAGE_WRITE_FAILED',
  MAX_WALLETS_REACHED: 'MAX_WALLETS_REACHED',
  MAX_CURRENCIES_REACHED: 'MAX_CURRENCIES_REACHED',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  AUTH_FAILED: 'AUTH_FAILED',
} as const;
```

**Global error boundary** di `App.tsx` untuk catch runtime error yang tidak tertangani.
Log error ke `console.error` dengan structured format di development.

---

## 12. TESTING STRATEGY

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit — utils, hooks | Vitest | Semua fungsi di `core/utils/` dan `useFeature.ts` |
| Component | React Testing Library | Happy path per komponen kritis |
| Integration | Vitest | Store + Storage flow |
| E2E | Tidak di V1 | — |

**Wajib test:**
- `currency.ts` — format semua currency yang didukung
- `date.ts` — kalkulasi periode mingguan/bulanan
- Semua store — initial state, setter, edge case
- Validasi max wallet, max currency

---

## 13. OPEN SOURCE READINESS

- `README.md` wajib berisi: cara setup, cara run, cara contribute, struktur folder singkat
- `CONTRIBUTING.md` — aturan PR, branch naming, commit convention
- Branch naming: `feat/nama-fitur`, `fix/nama-bug`, `chore/nama-task`
- Commit convention: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`)
- Issue template: bug report + feature request
- Tidak ada secret di codebase — semua credential via `.env`

---

## 14. ENVIRONMENT VARIABLES

```bash
# .env.example

# Supabase (opsional — hanya dibutuhkan jika cloud sync aktif)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Push Notification
VITE_VAPID_PUBLIC_KEY=

# App
VITE_APP_VERSION=0.1.0
```

---

## 15. PERFORMANCE BUDGET

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s (4G) |
| Time to Interactive | < 3s (4G) |
| Bundle size (initial) | < 200KB gzip |
| Lighthouse PWA Score | > 90 |
| Lighthouse Performance | > 85 |

**Strategi:**
- Code splitting per route (React.lazy + Suspense)
- Recharts di-lazy load — hanya dimuat saat Insight page dibuka
- Font preload di `<head>`
- Image/SVG avatar di-cache service worker

---

*Dokumen ini approved sebagai dasar untuk DATA_ARCHITECTURE.md dan implementasi.*
*Setiap perubahan stack atau pattern harus update dokumen ini terlebih dahulu.*
