# PROJECT_CONVENTIONS.md — CatatDuit v3

> Konvensi spesifik untuk project ini.
> Berlaku di atas `CLAUDE.md` — jika ada konflik, dokumen ini yang menang.

---

## 1. BAHASA

| Konteks | Bahasa |
|---------|--------|
| UI / copy semua halaman | Indonesia |
| Kode (variabel, fungsi, tipe, file) | Inggris |
| Komentar kode | Inggris |
| Commit message | Inggris |
| Nama file & folder | Inggris |
| Dokumen teknis (docs/) | Inggris |
| README.md | Inggris (dengan intro singkat Indonesia) |

---

## 2. NAMING CONVENTIONS

### 2.1 File & Folder

| Tipe | Convention | Contoh |
|------|------------|--------|
| React component | PascalCase | `GreetingCard.tsx` |
| Custom hook | camelCase, prefix `use` | `useTransactionForm.ts` |
| Zustand store | camelCase, suffix `.store` | `transaction.store.ts` |
| TypeScript types | camelCase, suffix `.types` | `transaction.types.ts` |
| Utility function | camelCase | `currency.ts`, `date.ts` |
| CSS Module | sama dengan komponen + `.module.css` | `GreetingCard.module.css` |
| Constants file | camelCase | `storage-keys.ts`, `currencies.ts` |
| Test file | sama dengan file yang ditest + `.test` | `currency.test.ts` |

### 2.2 Variabel & Fungsi

```typescript
// ✅ Boolean — prefix is / has / should
const isOnboardingDone = true;
const hasActiveBudget = false;
const shouldShowNudge = true;

// ✅ Event handler — prefix handle
const handleSaveTransaction = () => {};
const handleDeleteWallet = () => {};
const handleCurrencyChange = () => {};

// ✅ Async function — suffix jelas
const fetchTransactions = async () => {};
const saveWalletToStorage = async () => {};

// ✅ Computed/derived — nama deskriptif
const totalExpenseThisMonth = ...;
const activeCurrencyWallets = ...;
const overdueBills = ...;

// ❌ DILARANG
const x = ...;
const data = ...;
const temp = ...;
const handleClick = () => {}; // terlalu generik
```

### 2.3 TypeScript Types & Interfaces

```typescript
// Interface untuk data entity — PascalCase, nama langsung
interface Transaction { ... }
interface Wallet { ... }

// Type untuk union / literal
type TransactionType = 'expense' | 'income' | 'savings';
type PeriodType = 'weekly' | 'monthly';
type CurrencyCode = string; // alias untuk clarity

// Props — suffix Props
interface GreetingCardProps { ... }
interface TransactionFormProps { ... }

// Store state — suffix State
interface TransactionState { ... }
interface UIState { ... }
```

### 2.4 CSS Class (CSS Modules)

```css
/* camelCase, deskriptif */
.container { }
.headerTitle { }
.amountText { }
.currencyBadge { }

/* State modifier — suffix dengan state */
.buttonActive { }
.inputError { }
.itemSelected { }
```

---

## 3. STRUKTUR KOMPONEN

Urutan penulisan di dalam file `.tsx`:

```typescript
// 1. Imports — grouped dengan blank line antar group
import React, { useState, useEffect } from 'react';          // React
import { useNavigate } from 'react-router-dom';               // Third party

import { useTransactionStore } from './transaction.store';    // Internal stores
import { formatAmount } from '@/core/utils/currency';         // Internal utils
import { Button } from '@/components/Button/Button';          // Shared components

import styles from './ExpenseForm.module.css';                 // Styles (selalu terakhir)

// 2. Types / interfaces lokal (kalau tidak di .types.ts)
interface ExpenseFormProps {
  onClose: () => void;
}

// 3. Konstanta lokal (kalau ada)
const MAX_NOTES_LENGTH = 100;

// 4. Komponen utama
export function ExpenseForm({ onClose }: ExpenseFormProps) {
  // 4a. Hooks — urutan: state, context, store, custom hooks, effects
  const [amount, setAmount] = useState('');
  const { addTransaction } = useTransactionStore();
  const { selectedWallet } = useWalletStore();
  const { handleSubmit, errors } = useTransactionForm();

  useEffect(() => { ... }, []);

  // 4b. Derived / computed values
  const isSubmitDisabled = !amount || !selectedWallet;

  // 4c. Event handlers
  const handleAmountChange = (value: string) => { ... };
  const handleSave = () => { ... };

  // 4d. Render
  return ( ... );
}
```

---

## 4. ZUSTAND STORE CONVENTIONS

```typescript
// transaction.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Transaction } from './transaction.types';

// 1. State interface
interface TransactionState {
  transactions: Transaction[];
}

// 2. Actions interface (terpisah dari state)
interface TransactionActions {
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
}

// 3. Store
export const useTransactionStore = create<TransactionState & TransactionActions>()(
  persist(
    (set, get) => ({
      // Initial state
      transactions: [],

      // Actions — selalu gunakan set() atau get()
      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [...state.transactions, transaction],
        })),

      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),
    }),
    {
      name: 'cd_transactions', // localStorage key dari STORAGE_KEYS
    }
  )
);
```

**Aturan store:**
- Store hanya berisi state + setter — tidak ada business logic
- Business logic ada di `useFeature.ts`
- Semua store menggunakan `persist` middleware dari Zustand
- Nama persist key harus dari `STORAGE_KEYS` constants

---

## 5. CUSTOM HOOK CONVENTIONS

```typescript
// useTransactionForm.ts
// Hook bertanggung jawab atas: validasi, transformasi, dan koordinasi store

export function useTransactionForm(clock: Clock = new RealClock()) {
  // State lokal form
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Akses store
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const wallets = useWalletStore((s) => s.wallets);

  // Validasi — business logic ada di sini
  const validate = (data: TransactionFormData): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.walletId) newErrors.walletId = 'Pilih dompet dulu';
    if (!data.amount || data.amount <= 0) newErrors.amount = 'Nominal harus lebih dari 0';
    if (!data.categoryId && data.type !== 'savings') newErrors.categoryId = 'Pilih kategori';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = (data: TransactionFormData): boolean => {
    if (!validate(data)) return false;

    addTransaction({
      ...data,
      id: crypto.randomUUID(),
      createdAt: clock.now().toISOString(),
      updatedAt: clock.now().toISOString(),
      aiCategory: null,
      categoryConfidence: null,
    });

    return true;
  };

  return { handleSubmit, errors };
}
```

---

## 6. IMPORT ALIAS

Gunakan alias `@/` untuk import dari `src/`:

```typescript
// vite.config.ts
resolve: {
  alias: { '@': path.resolve(__dirname, './src') }
}

// tsconfig.json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}

// Usage
import { formatAmount } from '@/core/utils/currency';
import { Button } from '@/components/Button/Button';
import { STORAGE_KEYS } from '@/core/constants/storage-keys';
```

**Aturan:**
- Gunakan `@/` untuk semua import lintas folder
- Relative import (`./` atau `../`) hanya untuk file dalam folder yang sama

---

## 7. COMMIT CONVENTION

Format: **Conventional Commits**

```
<type>(<scope>): <description>

[optional body]
```

**Type:**

| Type | Kapan |
|------|-------|
| `feat` | Fitur baru |
| `fix` | Bug fix |
| `refactor` | Perubahan kode tanpa fitur baru atau bug fix |
| `style` | Perubahan CSS / visual tanpa logic |
| `test` | Tambah atau update test |
| `chore` | Update dependency, config, tooling |
| `docs` | Update dokumentasi |

**Scope:** nama feature folder (opsional tapi dianjurkan)

```bash
# Contoh
feat(transaction): add expense form with wallet selection
fix(bottom-sheet): prevent swipe dismiss when scrolling internally
refactor(currency): extract formatAmount to shared util
style(home): adjust greeting card spacing to match design system
test(transaction): add boundary cases for zero amount validation
chore: update vite to 5.2.0
docs: update DATA_ARCHITECTURE with savings goal schema
```

**Aturan:**
- Description dalam bahasa Inggris, lowercase, tanpa titik di akhir
- Max 72 karakter untuk subject line
- Body opsional — gunakan untuk jelaskan *kenapa*, bukan *apa*

---

## 8. BRANCH NAMING

```
feat/nama-fitur
fix/nama-bug
refactor/nama-area
chore/nama-task
```

```bash
# Contoh
feat/expense-form
feat/onboarding-flow
fix/bottom-nav-scroll
fix/currency-filter-pill
refactor/storage-adapter
chore/setup-vitest
```

**Aturan:**
- Lowercase, pisah dengan `-`
- Singkat tapi deskriptif (max 4 kata)
- Branch dari `main`, merge ke `main` via PR

---

## 9. FOLDER IMPORT ORDER (ESLint)

Urutan import diatur oleh ESLint plugin `import/order`:

```
1. React
2. Third-party libraries
3. Internal — @/stores/
4. Internal — @/features/
5. Internal — @/components/
6. Internal — @/core/
7. Internal — @/hooks/
8. Relative imports (./ atau ../)
9. CSS Modules (selalu paling bawah)
```

---

## 10. ENV VARIABLE NAMING

Semua env variable untuk Vite:
- Prefix `VITE_` (wajib agar exposed ke client)
- SCREAMING_SNAKE_CASE
- Didokumentasikan di `.env.example` dengan komentar

```bash
# Supabase
VITE_SUPABASE_URL=           # URL project Supabase kamu
VITE_SUPABASE_ANON_KEY=      # Anon/public key dari Supabase dashboard

# Push Notification
VITE_VAPID_PUBLIC_KEY=       # Generate dengan: npx web-push generate-vapid-keys

# App Info
VITE_APP_VERSION=0.1.0       # Sync dengan package.json version
```

---

## 11. ERROR MESSAGE CONVENTIONS

Semua pesan error yang tampil ke user ditulis dalam bahasa Indonesia, singkat, dan actionable.

```typescript
// ✅ GOOD — jelas masalahnya, ada hint solusi
'Nominal harus lebih dari 0'
'Pilih dompet dulu'
'Nama dompet sudah dipakai'
'Maksimal 10 dompet, hapus dompet yang tidak dipakai'
'Maksimal 2 jenis mata uang'

// ❌ BAD — terlalu teknis atau tidak informatif
'Invalid amount'
'Error: walletId is required'
'Something went wrong'
'Validation failed'
```

---

## 12. ID GENERATION

Selalu gunakan `crypto.randomUUID()` — native browser, no dependency.

```typescript
const newTransaction: Transaction = {
  id: crypto.randomUUID(),
  ...
};
```

Tidak boleh pakai `Math.random()`, timestamp sebagai ID, atau library UUID eksternal.

---

## 13. DATE HANDLING

- Semua tanggal disimpan sebagai string ISO 8601
- `date` (tanggal transaksi) → format `YYYY-MM-DD`
- `createdAt`, `updatedAt`, `paidAt` → format `YYYY-MM-DDTHH:mm:ssZ`
- Semua kalkulasi tanggal melalui `Clock` — tidak ada `new Date()` langsung di logic
- Format tampilan menggunakan `Intl.DateTimeFormat` dengan locale `id-ID`

```typescript
// ✅ Format untuk tampilan
const formatted = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date(transaction.date));
// Output: "15 Januari 2024"
```

---

## 14. PROJECT INFO

| Info | Detail |
|------|--------|
| Repo | https://github.com/chandragumelar/catatduit |
| Production URL | https://app-catatduit.vercel.app |
| Deploy | Vercel — auto deploy dari branch `main` |
| Node version | 20.x LTS |
| Package manager | npm |

---

*Dokumen ini adalah living document.*
*Update via PR dengan deskripsi alasan perubahan yang jelas.*
