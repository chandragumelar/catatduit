# CLAUDE.md — Universal Rules for All Projects

> Berlaku untuk semua project, semua bahasa, semua framework.
> Ikuti rules ini secara ketat. Jangan dilanggar tanpa persetujuan eksplisit.
> *Per-project detail boleh ditimpa di `PROJECT_CONVENTIONS.md`.*

---

## 0. PROJECT SETUP WORKFLOW (WAJIB)

Sebelum mulai coding besar atau scaffold, dokumen berikut harus tersedia dan approved:

1. `PROJECT_BRIEF.md` — scope, tujuan, user, constraint
2. `INFORMATION_ARCHITECTURE.md` + `DESIGN_SYSTEM.md`
3. `TECHNICAL_DESIGN.md` + `DATA_ARCHITECTURE.md` ← paling penting
4. `DEFINITION_OF_DONE.md` + `PROJECT_CONVENTIONS.md`

> Kalau diminta coding langsung tanpa dokumen: tanya dulu.
> "Dokumen teknisnya sudah siap? Kalau belum, kita buat ringkas dulu biar tidak bolak-balik."

---

## 1. CORE PRINCIPLES

### 1.1 KISS & Pragmatic — Jangan Overengineer

Pilih solusi dengan **kode paling sedikit** yang cukup untuk kebutuhan sekarang + 6 bulan ke depan.

**Dilarang:**
- Abstraction layer, interface, generic class, atau design pattern (Factory, Strategy, Decorator, dll) kecuali sudah dibutuhkan sekarang
- Folder nesting >3 level di awal project
- Service wrapper hanya untuk "biar clean"
- Early optimization (caching, indexing, concurrency) sebelum ada bukti bottleneck
- Membuat helper/util untuk kode yang baru dipakai sekali

**Wajib:**
- Pakai built-in framework kalau sudah cukup (Next.js Route Handler, Laravel Controller, Django View, dll)
- Kalau ada 2 solusi, pilih yang lebih sedikit file & function
- Saat ragu: tanya — "Apakah ini perlu di-abstract sekarang?"

---

### 1.2 Single Responsibility & Modularity

- 1 function → 1 tugas jelas (max 50 baris)
- 1 file → 1 konsep (jangan campur controller + logic + repository)
- 1 module/folder → 1 fitur/domain

**Struktur yang disukai (feature-based, bukan type-based):**

```
features/
  auth/
    login.service.ts
    login.controller.ts
    login.test.ts
  transaction/
    transaction.service.ts
    transaction.controller.ts
    transaction.test.ts
```

> Kenapa? Kalau fitur dihapus, tinggal hapus 1 folder. Tidak ada sisa di mana-mana.

---

### 1.3 Readability & Maintainability

- Nama variabel & function harus **self-explanatory** (`calculateMonthlyGrowth`, bukan `calc`)
- Hindari nested logic >3 level — extract ke function terpisah
- Comment hanya untuk **business reason / tradeoff**, bukan penjelasan *apa* yang dilakukan
- Kode harus bisa dibaca senior dev dalam <30 detik tanpa penjelasan

```ts
// ❌ BAD
const x = d.filter(i => i.s === 1).map(i => i.v * 0.1);

// ✅ GOOD
const activeTransactions = transactions.filter(t => t.status === 'active');
const discountedValues = activeTransactions.map(t => t.value * DISCOUNT_RATE);
```

---

### 1.4 Production-Grade Scaffold

Saat scaffolding project baru, **wajib include:**
- `.env.example` (semua env var terdokumentasi)
- Structured logging
- Global error handler
- Input validation
- Basic test setup
- `Clock` / `TimeProvider`
- `README.md` yang jelas

**Jangan include di awal:**
- Advanced monitoring / APM
- Feature flag system
- CQRS / Event Sourcing
- Multi-tenancy
- Rate limiting complex

---

## 2. STATE MANAGEMENT (FRONTEND)

### 2.1 Kapan Pakai Local vs Global State

| Kebutuhan | Gunakan |
|---|---|
| State hanya dipakai 1 komponen | `useState` / `useReducer` lokal |
| State dipakai 2–3 komponen berdekatan | Lift state ke parent |
| State dipakai banyak komponen jauh | Context API atau state manager |
| State dari server (fetch/cache) | React Query / SWR / tRPC |
| State global kompleks (banyak action) | Zustand / Redux Toolkit |

> **Aturan default: mulai dari lokal. Pindah ke global hanya kalau prop drilling >2 level.**

### 2.2 Component Size & Responsibility

- 1 komponen → 1 tanggung jawab visual
- Max 150 baris per file komponen (termasuk styles inline)
- Kalau komponen punya >3 section visual → pecah jadi sub-komponen
- Jangan campur data-fetching + rendering + business logic dalam 1 komponen

```
// Struktur komponen yang disukai
ComponentName/
  index.tsx          ← entry point, komposisi
  ComponentName.tsx  ← rendering utama
  useComponentName.ts ← logic/hooks
  ComponentName.test.ts
```

### 2.3 Props

- Max 5 props per komponen
- Kalau butuh >5 props → kemungkinan komponen harus dipecah, atau pakai object/config prop
- Jangan pass state yang tidak dipakai ("prop drilling buta")

---

## 3. TIME & THRESHOLD LOGIC (WAJIB)

**Jangan pernah** pakai `new Date()`, `Date.now()`, `datetime.now()` langsung di business logic.

Selalu inject `Clock` / `TimeProvider`:

```ts
// clock.ts
export interface Clock {
  now(): Date;
}

export class RealClock implements Clock {
  now() { return new Date(); }
}

export class TestClock implements Clock {
  constructor(private fixedDate: Date) {}
  now() { return this.fixedDate; }
}
```

Di test: gunakan `TestClock` dan seed langsung — jangan loop untuk simulasi waktu.

---

## 4. ERROR HANDLING

- Setiap public function wajib: validasi input + handle error
- **Dilarang:** `catch (e) {}` kosong atau silent return
- Gunakan custom error class + structured log

```ts
// error.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
  }
}

// usage
throw new AppError('User not found', 'USER_NOT_FOUND', { userId });
```

**Log structure:**
```json
{ "userId": "123", "errorCode": "USER_NOT_FOUND", "context": { "requestId": "abc" } }
```

---

## 5. TESTING

- Tulis test **bersama** implementasi, bukan setelah
- Wajib cover: happy path, empty data, boundary case, threshold case
- Gunakan `TestClock` untuk semua yang berhubungan waktu
- Mock hanya external dependency (API, DB, clock) — bukan internal logic

```ts
describe('calculateHealthScore', () => {
  it('returns 100 for perfect data', ...)       // happy path
  it('returns 0 when no transactions', ...)     // empty data
  it('handles exactly 30-day boundary', ...)    // boundary
  it('caps at 100 even with overflow input', .) // threshold
});
```

---

## 6. DEAD CODE PREVENTION

> Dead code adalah hutang teknis yang tidak terlihat.

**Aturan:**
- Jangan buat function/component/hook kalau belum ada yang memanggilnya
- Jangan buat abstraction "untuk nanti"
- Kalau fitur dihapus → hapus semua file, test, type, dan import-nya sekaligus
- Review: sebelum PR, cek apakah ada file/export yang tidak lagi dipakai

**Deteksi otomatis (rekomendasikan setup di project):**
```bash
# JS/TS
npx ts-prune        # unused exports
npx unimported      # unused files

# Python
vulture src/        # unused code
```

---

## 7. AGILITY — MUDAH DIUBAH, DITAMBAH, DIHAPUS

Kode yang agile bukan kode yang "sudah antisipasi semua". Kode yang agile adalah kode yang **mudah dihapus dan diganti**.

**Prinsip:**
- Dependency antar modul harus satu arah (tidak circular)
- Feature flag untuk fitur besar yang masih in-progress (pakai env var sederhana, bukan library rumit)
- Pisahkan **konfigurasi** dari **logic** — config di `.env` atau `config/`, bukan hardcode
- Schema/contract perubahan harus versioned kalau ada consumer lain (API, DB migration)

**Checklist saat menambah fitur:**
- [ ] Fitur ini di folder/module sendiri?
- [ ] Ada test yang bisa di-run isolated?
- [ ] Kalau fitur ini dihapus, berapa file yang ikut dihapus? (idealnya ≤ 1 folder)

**Checklist saat mengubah fitur:**
- [ ] Apakah perubahan ini mempengaruhi module lain?
- [ ] Kalau iya, apakah interface/contract-nya tetap sama?

**Checklist saat menghapus fitur:**
- [ ] Semua referensi ke feature ini sudah dihapus?
- [ ] Test yang berkaitan sudah dihapus?
- [ ] Tidak ada orphan file/type/export?

---

## 8. ANTI-PATTERN (DILARANG KERAS)

| Anti-pattern | Pengganti |
|---|---|
| Magic number / hardcoded string | Named constant di `constants.ts` |
| Duplicate logic >2x | Extract ke helper/util |
| Overly generic code "biar future proof" | YAGNI — tulis untuk sekarang |
| Silent error / empty catch | Throw atau log structured |
| Nested ternary >1 level | if/else atau early return |
| Function dengan >5 parameter | Object param / config object |
| `any` type di TypeScript | Proper type atau `unknown` |
| Komponen >150 baris | Pecah jadi sub-komponen |
| Import circular antar module | Refactor dependency direction |

---

## 9. NAMING & DOCUMENTATION

- Ikuti `PROJECT_CONVENTIONS.md` (buat dulu kalau belum ada)
- Nama panjang tapi jelas > singkatan misterius
- Comment hanya untuk **business reason** atau **tradeoff teknis**

```ts
// ❌ BAD — menjelaskan apa yang dilakukan (sudah jelas dari kode)
// multiply value by 0.1
const discounted = value * 0.1;

// ✅ GOOD — menjelaskan kenapa
// PPN dikecualikan untuk transaksi di bawah threshold regulasi UMKM
const taxExempt = transactionValue < TAX_EXEMPTION_THRESHOLD;
```

---

## 10. COLLABORATION RULES

> Rules ini yang membuat dev lain (atau AI) bisa langsung kontribusi tanpa onboarding panjang.

- **Sebelum ubah >3 file** → kasih tahu dulu, jelaskan dampaknya
- **Kalau ada tradeoff** → tanya dulu sebelum implementasi
- **Selalu respect** style & struktur existing codebase
- **PR/commit harus atomic** — 1 PR = 1 tujuan jelas
- **Jangan fix 2 hal dalam 1 commit** — pisahkan refactor dan feature
- **`README.md` wajib update** kalau ada perubahan cara setup/run project

**Struktur commit message:**
```
feat(auth): add JWT refresh token logic
fix(wallet): correct balance calculation on zero state
refactor(transaction): extract formatCurrency to shared util
chore: update dependencies
```

---

## 11. SELF-REVIEW CHECKLIST (WAJIB sebelum kirim kode)

- [ ] Mengikuti KISS — tidak ada abstraction berlebih
- [ ] Function <50 baris, component <150 baris, file <300 baris
- [ ] Clock/TimeProvider digunakan (kalau ada time logic)
- [ ] Error handling & input validation lengkap
- [ ] Test ada untuk semua logic penting
- [ ] Tidak ada magic number / hardcoded string
- [ ] Tidak ada duplicate logic
- [ ] Nama variabel & function self-explanatory
- [ ] Tidak ada dead code / unused export
- [ ] Dependency tidak circular
- [ ] State management sesuai level kebutuhan (local → global)
- [ ] Kalau hapus/ubah fitur: semua referensi sudah bersih

---

*File ini living document. Update via PR dengan alasan yang jelas.*
*Per-project detail ditimpa di `PROJECT_CONVENTIONS.md`.*
