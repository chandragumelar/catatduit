# DATA_ARCHITECTURE.md — CatatDuit v3

> Dokumen ini mendefinisikan semua schema data, relasi antar entitas,
> aturan validasi, dan strategi penyimpanan.
> Semua perubahan schema harus update dokumen ini terlebih dahulu.

---

## 1. PRINSIP

- **localStorage sebagai source of truth** — Supabase hanya backup opsional
- **Flat structure** — tidak ada nested object dalam, semua relasi via ID
- **AI-ready** — field `notes`, `aiCategory`, `categoryConfidence` disiapkan sejak V1
- **Immutable ID** — semua entitas punya `id` (UUID v4) yang tidak pernah berubah
- **Audit trail minimal** — semua entitas punya `createdAt` dan `updatedAt`

---

## 2. ENTITY OVERVIEW

```
UserProfile
    │
    ├── Wallet (max 10, max 2 currency berbeda)
    │       │
    │       └── Transaction (expense / income / savings)
    │
    ├── Category (default + custom)
    │
    ├── Budget (per category, per period)
    │
    ├── Bill (recurring / non-recurring)
    │
    └── SavingsGoal
```

---

## 3. SCHEMA

### 3.1 UserProfile

```typescript
interface UserProfile {
  id: string;                    // UUID v4, generated sekali saat onboarding
  nickname: string;              // Nama panggilan, required
  avatarStyle: 'bottts' | 'dylan'; // Style DiceBear yang dipilih user
  avatarSeed: string;            // Seed untuk generate avatar (default: nickname)
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

**Storage key:** `cd_user_profile`

---

### 3.2 Wallet

```typescript
interface Wallet {
  id: string;                    // UUID v4
  name: string;                  // Nama dompet, required, max 30 char
  currencyCode: string;          // ISO 4217: 'IDR', 'USD', 'AUD', dll
  initialBalance: number;        // Saldo awal saat dibuat, default 0
  createdAt: string;
  updatedAt: string;
}
```

**Storage key:** `cd_wallets` → `Wallet[]`

**Validasi:**
- Max 10 wallet
- Max 2 currency berbeda di seluruh array wallet
- `currencyCode` harus ada di `core/constants/currencies.ts`
- `name` tidak boleh kosong dan tidak boleh duplikat

**Computed (tidak disimpan):**
- `currentBalance` = `initialBalance` + sum semua transaksi dompet ini

---

### 3.3 Category

```typescript
interface Category {
  id: string;                    // UUID v4
  name: string;                  // Nama kategori, max 30 char
  icon: string;                  // Nama icon Phosphor (e.g. 'ShoppingCart')
  type: 'expense' | 'income';
  isDefault: boolean;            // true = tidak bisa dihapus user
  createdAt: string;
  updatedAt: string;
}
```

**Storage key:** `cd_categories` → `Category[]`

**Default kategori — Expense:**

| Nama | Icon |
|------|------|
| Makanan & Minuman | `ForkKnife` |
| Transportasi | `Car` |
| Belanja | `ShoppingBag` |
| Tagihan & Utilitas | `Receipt` |
| Kesehatan | `FirstAid` |
| Hiburan | `GameController` |
| Pendidikan | `GraduationCap` |
| Keluarga | `Users` |
| Cicilan | `CreditCard` |
| Lainnya | `DotsThree` |

**Default kategori — Income:**

| Nama | Icon |
|------|------|
| Gaji | `Money` |
| Freelance | `Briefcase` |
| Bisnis | `Storefront` |
| Transfer Masuk | `ArrowDownLeft` |
| Lainnya | `DotsThree` |

---

### 3.4 Transaction

```typescript
interface Transaction {
  id: string;                    // UUID v4
  type: 'expense' | 'income' | 'savings';
  walletId: string;              // FK → Wallet.id
  categoryId: string;            // FK → Category.id (tidak wajib untuk type 'savings')
  amount: number;                // Selalu positif, min 1
  notes: string;                 // Teks bebas dari user — INPUT UTAMA AI V2
  date: string;                  // ISO 8601 date (YYYY-MM-DD), bukan datetime
  createdAt: string;             // ISO 8601 datetime — untuk sorting
  updatedAt: string;

  // AI fields — null di V1, akan diisi Transformers.js di V2
  aiCategory: string | null;     // Kategori yang disuggest AI
  categoryConfidence: number | null; // 0.0 - 1.0
}
```

**Storage key:** `cd_transactions` → `Transaction[]`

**Validasi:**
- `amount` > 0
- `walletId` harus valid (ada di wallets)
- `categoryId` wajib untuk type `expense` dan `income`
- `date` tidak boleh lebih dari 1 tahun ke belakang (soft warning, bukan hard block)

**Catatan penting:**
- `date` adalah tanggal transaksi (dipilih user), bukan `createdAt`
- Sorting tampilan menggunakan `date` DESC, tie-break dengan `createdAt` DESC
- Tidak ada soft delete — hapus transaksi benar-benar dihapus dari array

---

### 3.5 Budget

```typescript
interface Budget {
  id: string;                    // UUID v4
  categoryId: string;            // FK → Category.id
  amount: number;                // Limit nominal, min 1
  periodType: 'weekly' | 'monthly';
  currencyCode: string;          // Harus match dengan activeCurrency saat dibuat
  createdAt: string;
  updatedAt: string;
}
```

**Storage key:** `cd_budgets` → `Budget[]`

**Validasi:**
- Tidak boleh ada 2 budget dengan `categoryId` + `periodType` yang sama
- `currencyCode` harus valid

**Computed (tidak disimpan):**
- `spent` = sum transaksi expense kategori ini dalam periode aktif
- `remaining` = `amount` - `spent`
- `percentage` = `spent` / `amount` * 100

---

### 3.6 Bill

```typescript
interface Bill {
  id: string;                    // UUID v4
  name: string;                  // Nama tagihan, max 50 char
  amount: number;                // Nominal, min 1
  currencyCode: string;
  isRecurring: boolean;
  frequency: 'weekly' | 'monthly' | 'yearly' | null; // null jika tidak recurring
  dueDate: string;               // ISO 8601 date — tanggal jatuh tempo berikutnya
  isPaid: boolean;               // Status pembayaran periode ini
  paidAt: string | null;         // ISO 8601 datetime saat ditandai lunas
  createdAt: string;
  updatedAt: string;
}
```

**Storage key:** `cd_bills` → `Bill[]`

**Validasi:**
- Jika `isRecurring: true`, `frequency` wajib diisi
- Jika `isRecurring: false`, `frequency` harus `null`

**Behavior recurring:**
- Saat `isPaid` di-set `true` pada tagihan recurring → `dueDate` otomatis di-advance sesuai `frequency`, `isPaid` reset ke `false`
- Advance logic ada di hook `useBills.ts`, bukan di store

**Notifikasi trigger:**
- H-1: `dueDate` = besok dan `isPaid: false`
- Hari H: `dueDate` = hari ini dan `isPaid: false`
- H+1: `dueDate` = kemarin dan `isPaid: false`

---

### 3.7 SavingsGoal

```typescript
interface SavingsGoal {
  id: string;                    // UUID v4
  name: string;                  // Nama target, max 50 char
  targetAmount: number;          // Nominal tujuan, min 1
  currencyCode: string;
  createdAt: string;
  updatedAt: string;
}
```

**Storage key:** `cd_savings_goals` → `SavingsGoal[]`

**Catatan:**
- Transaksi nabung tidak di-link ke SavingsGoal di V1 (sesuai keputusan di IA)
- SavingsGoal hanya sebagai referensi / reminder nominal tujuan

---

### 3.8 OnboardingState

```typescript
interface OnboardingState {
  isDone: boolean;
  completedAt: string | null;    // ISO 8601
}
```

**Storage key:** `cd_onboarding_done`

---

### 3.9 NudgeState

```typescript
interface NudgeState {
  hasFirstTransaction: boolean;
  hasFirstBill: boolean;
  hasFirstSavingsGoal: boolean;
  isDismissed: boolean;          // true jika user dismiss manual atau semua selesai
}
```

**Storage key:** `cd_nudge_state`

---

### 3.10 AppSettings

```typescript
interface AppSettings {
  activeCurrency: string;        // Currency code yang aktif di filter
  activePeriodType: 'weekly' | 'monthly';
  pushNotifEnabled: boolean;
  pushNotifTime: string;         // Format HH:MM, default '21:00'
  pushNotifSubscription: PushSubscriptionJSON | null;
}
```

**Storage key:** `cd_app_settings`

---

## 4. CURRENCY CONSTANTS

```typescript
// core/constants/currencies.ts

export interface CurrencyDefinition {
  code: string;      // ISO 4217
  symbol: string;    // Simbol tampilan
  name: string;      // Nama lengkap dalam bahasa Indonesia
}

export const SUPPORTED_CURRENCIES: CurrencyDefinition[] = [
  { code: 'IDR', symbol: 'Rp',  name: 'Rupiah Indonesia' },
  { code: 'USD', symbol: '$',   name: 'Dolar Amerika' },
  { code: 'EUR', symbol: '€',   name: 'Euro' },
  { code: 'GBP', symbol: '£',   name: 'Poundsterling Inggris' },
  { code: 'AUD', symbol: 'A$',  name: 'Dolar Australia' },
  { code: 'SGD', symbol: 'S$',  name: 'Dolar Singapura' },
  { code: 'MYR', symbol: 'RM',  name: 'Ringgit Malaysia' },
  { code: 'JPY', symbol: '¥',   name: 'Yen Jepang' },
  { code: 'CNY', symbol: '¥',   name: 'Yuan China' },
  { code: 'SAR', symbol: '﷼',   name: 'Riyal Arab Saudi' },
];
```

> Daftar ini bisa ditambah di update berikutnya tanpa perubahan schema.

---

## 5. RELASI & COMPUTED VALUES

### 5.1 Wallet Balance

```
currentBalance(walletId) =
  wallet.initialBalance
  + SUM(transactions WHERE walletId = walletId AND type = 'income', amount)
  + SUM(transactions WHERE walletId = walletId AND type = 'savings', amount)
  - SUM(transactions WHERE walletId = walletId AND type = 'expense', amount)
```

### 5.2 Total Net Worth (per currency)

```
netWorth(currencyCode) =
  SUM(currentBalance(wallet) WHERE wallet.currencyCode = currencyCode)
```

### 5.3 Cashflow Periode

```
cashflowIncome(currencyCode, startDate, endDate) =
  SUM(amount WHERE type = 'income'
    AND wallet.currencyCode = currencyCode
    AND date BETWEEN startDate AND endDate)

cashflowExpense(currencyCode, startDate, endDate) =
  SUM(amount WHERE type = 'expense'
    AND wallet.currencyCode = currencyCode
    AND date BETWEEN startDate AND endDate)
```

### 5.4 Budget Progress

```
budgetSpent(budgetId, periodStart, periodEnd) =
  SUM(transaction.amount
    WHERE transaction.type = 'expense'
    AND transaction.categoryId = budget.categoryId
    AND transaction.wallet.currencyCode = budget.currencyCode
    AND transaction.date BETWEEN periodStart AND periodEnd)
```

### 5.5 Period Boundaries (via Clock)

```typescript
// Semua kalkulasi periode menggunakan Clock — tidak boleh new Date() langsung

function getWeekBoundary(clock: Clock): { start: Date; end: Date }
function getMonthBoundary(clock: Clock): { start: Date; end: Date }
function getPreviousWeekBoundary(clock: Clock): { start: Date; end: Date }
function getPreviousMonthBoundary(clock: Clock): { start: Date; end: Date }
```

---

## 6. VALIDASI GLOBAL

| Rule | Detail |
|------|--------|
| Max wallet | 10 wallet total |
| Max currency | 2 currency berbeda di semua wallet |
| Min wallet | 1 wallet harus ada (tidak bisa hapus semua) |
| Amount | Selalu > 0, integer atau decimal max 2 digit |
| String fields | Trim whitespace, tidak boleh hanya spasi |
| Date | Format YYYY-MM-DD, tidak menerima future date > 1 hari |
| Currency code | Harus ada di `SUPPORTED_CURRENCIES` |

---

## 7. SUPABASE SCHEMA (Opsional — Cloud Sync)

Jika user login dan aktifkan sync, data di-mirror ke Supabase dengan schema berikut.
Struktur identik dengan localStorage, ditambah `user_id` untuk RLS.

```sql
-- Semua tabel punya struktur serupa
-- Contoh: transactions

create table transactions (
  id           uuid primary key,
  user_id      uuid references auth.users not null,
  type         text not null check (type in ('expense', 'income', 'savings')),
  wallet_id    uuid not null,
  category_id  uuid,
  amount       numeric not null check (amount > 0),
  notes        text default '',
  date         date not null,
  ai_category  text,
  category_confidence numeric check (category_confidence between 0 and 1),
  created_at   timestamptz not null,
  updated_at   timestamptz not null
);

-- Row Level Security: user hanya bisa akses data miliknya
alter table transactions enable row level security;

create policy "users can only access own data"
  on transactions for all
  using (auth.uid() = user_id);
```

> Tabel lain (wallets, categories, budgets, bills, savings_goals) mengikuti pola yang sama.
> Migration file ada di `supabase/migrations/`.

---

## 8. EXPORT FORMAT (CSV)

Saat user export data dari Data Card, format CSV:

```
id,type,wallet_name,currency,category_name,amount,notes,date,created_at
uuid,expense,Dompet Harian,IDR,Makanan & Minuman,25000,makan siang warteg,2024-01-15,2024-01-15T12:30:00Z
```

**Aturan:**
- Semua transaksi di-export, diurutkan `date` DESC
- Nama dompet dan kategori di-resolve (bukan ID)
- Field AI (`aiCategory`, `categoryConfidence`) tidak diinclude di V1 export
- Encoding: UTF-8 with BOM (untuk kompatibilitas Excel di Windows)

---

## 9. RESET APLIKASI

Saat user pilih "Reset Aplikasi" di Data Card (setelah konfirmasi 2 langkah):

1. Hapus semua key `cd_*` dari localStorage
2. Hapus push notification subscription
3. Jika login: logout dari Supabase (tidak hapus data di Supabase)
4. Redirect ke onboarding flow

---

## 10. DATA MIGRATION (FUTURE)

Setiap perubahan schema di masa depan harus:
1. Tambah field baru sebagai **optional** (`field?: type`) — tidak breaking
2. Hapus field lama di update berikutnya setelah semua client ter-update
3. Tambah version di `cd_app_settings`: `schemaVersion: number`
4. Jalankan migration function saat app load jika `schemaVersion` lebih lama

> V1 tidak perlu migration — ini disiapkan untuk masa depan.
> `schemaVersion` di V1 = `1`.

---

*Dokumen ini approved sebagai dasar untuk implementasi semua feature store dan hook.*
*Setiap perubahan schema harus update dokumen ini dan disetujui sebelum coding.*
